// ai_processor.js
// Consumes tour data, processes it with Gemini 3 Flash, and updates the live feed.

const { Kafka } = require('kafkajs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('redis');
require('dotenv').config();

// Configuration
const BATCH_WINDOW_MS = 60000; // 60 seconds processing window
const MODEL_NAME = 'gemini-2.0-flash-exp'; // Using latest flash preview (adjust to 'gemini-3-flash' if available)
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity

// Initialize Clients
const kafka = new Kafka({
  clientId: 'tourflow-ai-processor',
  brokers: [process.env.CONFLUENT_BOOTSTRAP_SERVER],
  ssl: true,
  sasl: {
    mechanism: 'plain',
    username: process.env.CONFLUENT_API_KEY,
    password: process.env.CONFLUENT_API_SECRET,
  },
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: MODEL_NAME });

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', err => console.error('Redis Client Error', err));

const consumer = kafka.consumer({ groupId: 'tourflow-ai-group' });
const producer = kafka.producer();

// In-memory timer references only (Data is in Redis)
// Structure: { [sessionId]: Timer }
const activeTimers = {};

const connect = async () => {
  await redisClient.connect();
  console.log('Connected to Redis');

  await consumer.connect();
  await producer.connect();
  console.log('AI Processor Connected to Kafka');

  // Subscribe to raw topics (in a real prod scenario, we might consume a pre-windowed Flink topic)
  await consumer.subscribe({ topics: ['tour-audio-chunks', 'tour-photos-raw'], fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const key = message.key.toString();
      const value = JSON.parse(message.value.toString());
      
      await handleIncomingData(key, topic, value);
    },
  });
};

const handleIncomingData = async (sessionId, topic, data) => {
  const audioKey = `session:${sessionId}:audio`;
  const photosKey = `session:${sessionId}:photos`;

  try {
    // Push data to Redis and refresh expiry
    if (topic === 'tour-audio-chunks') {
      await redisClient.rPush(audioKey, JSON.stringify(data));
      await redisClient.expire(audioKey, SESSION_TIMEOUT_MS / 1000);
    } else if (topic === 'tour-photos-raw') {
      await redisClient.rPush(photosKey, JSON.stringify(data));
      await redisClient.expire(photosKey, SESSION_TIMEOUT_MS / 1000);
    }

    // If no timer is running, start one to process the window
    if (!activeTimers[sessionId]) {
      activeTimers[sessionId] = setTimeout(() => processWindow(sessionId), BATCH_WINDOW_MS);
      console.log(`Started processing window for session ${sessionId}`);
    }
  } catch (error) {
    console.error(`Error handling incoming data for session ${sessionId}:`, error);
  }
};

const processWindow = async (sessionId) => {
  // Clear timer reference immediately for next batch
  if (activeTimers[sessionId]) {
    // Ideally the timer just fired, so we just remove the ref. 
    // If we manually called this, we'd clear it.
    delete activeTimers[sessionId];
  }

  const audioKey = `session:${sessionId}:audio`;
  const photosKey = `session:${sessionId}:photos`;

  try {
    // Atomic retrieve and delete from Redis
    const multi = redisClient.multi();
    multi.lRange(audioKey, 0, -1);
    multi.del(audioKey);
    multi.lRange(photosKey, 0, -1);
    multi.del(photosKey);

    const results = await multi.exec();
    // results: [audioList, delCount, photosList, delCount]
    
    // In node-redis v4, results might be an array of responses.
    const audioStrings = results[0];
    const photoStrings = results[2];

    const currentAudio = audioStrings ? audioStrings.map(s => JSON.parse(s)) : [];
    const currentPhotos = photoStrings ? photoStrings.map(s => JSON.parse(s)) : [];

    if (currentAudio.length === 0 && currentPhotos.length === 0) return;

    console.log(`Processing window for ${sessionId}: ${currentAudio.length} audio chunks, ${currentPhotos.length} photos`);

    // 1. Prepare parts for Gemini
    const parts = [];

    // Prompt
    parts.push({
      text: `You are the AI producer for "TourFlow", a live interactive tour feed.
      Your goal is to create engaging, real-time updates for an audience following along remotely.
      
      Analyze the attached audio commentary (from the guide) and photos (from guide and guests).
      
      1. **Listen:** Extract key facts, location names, and the story from the audio.
      2. **Curate:** Review all photos. Select the *single best* image that matches the audio's moment. 
         - Prioritize Guide photos unless a Guest photo is exceptional.
         - Strictly ignore blurry, irrelevant, or inappropriate images.
      3. **Write:** specific, engaging social-media style caption (Instagram/TikTok style).
         - Use emojis 🌍✨📸.
         - Keep it under 280 characters.
         - Make it feel "live".
      
      Output strictly valid JSON:
      { 
        "timestamp": "ISO_STRING", 
        "caption": "Your engaging caption here...", 
        "highlight_image_index": 0, // Index in the provided photo list (integer)
        "guest_credit": "Name or null" 
      }`
    });

    // Add Photos (Inline Data)
    currentPhotos.forEach((photo) => {
      parts.push({
        inlineData: {
          mimeType: photo.metadata?.mimeType || 'image/jpeg',
          data: photo.data
        }
      });
    });

    // Add Audio
    currentAudio.forEach(audio => {
        parts.push({
            inlineData: {
                mimeType: audio.metadata?.mimeType || 'audio/mp3',
                data: audio.data
            }
        });
    });

    // 2. Call Gemini with retry logic
    let response;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
        try {
            const result = await model.generateContent(parts);
            response = await result.response;
            break;
        } catch (e) {
            attempts++;
            const isRateLimit = e.status === 429 || e.message?.includes('429') || e.message?.includes('QUOTA_EXCEEDED');
            if (isRateLimit && attempts < maxAttempts) {
                console.warn(`Gemini Rate limit hit. Attempt ${attempts}/${maxAttempts}. Retrying in 10s...`);
                await new Promise(resolve => setTimeout(resolve, 10000));
            } else if (attempts >= maxAttempts) {
                throw e;
            } else {
                console.warn(`Gemini API error. Attempt ${attempts}/${maxAttempts}. Retrying in 2s...`, e.message);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }

    const text = response.text();
    
    // 3. Robust JSON Parsing
    let aiOutput;
    try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : text;
        aiOutput = JSON.parse(jsonStr);
    } catch (parseError) {
        console.error("Failed to parse Gemini JSON response. Raw text:", text);
        return; 
    }

    // 4. Select the image data to pass through
    let highlightImageBase64 = null;
    if (currentPhotos.length > 0 && typeof aiOutput.highlight_image_index === 'number') {
        const selectedPhoto = currentPhotos[aiOutput.highlight_image_index];
        if (selectedPhoto) {
            highlightImageBase64 = selectedPhoto.data;
        }
    }

    // 5. Publish to tour-live-feed
    const feedPayload = {
      sessionId,
      caption: aiOutput.caption,
      timestamp: aiOutput.timestamp || new Date().toISOString(),
      credit: aiOutput.guest_credit,
      image: highlightImageBase64, 
    };

    await producer.send({
      topic: 'tour-live-feed',
      messages: [
        {
          key: sessionId,
          value: JSON.stringify(feedPayload),
        },
      ],
    });

    console.log(`[LIVE FEED] Updated session ${sessionId}: ${aiOutput.caption}`);

  } catch (error) {
    console.error(`Error processing window for ${sessionId}:`, error);
  }
};

// Start
if (require.main === module) {
  connect().catch(console.error);
}