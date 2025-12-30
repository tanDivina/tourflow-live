// ai_processor.js
// Consumes tour data, processes it with Gemini 3 Flash, and updates the live feed.

const { Kafka } = require('kafkajs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Configuration
const BATCH_WINDOW_MS = 60000; // 60 seconds processing window
const MODEL_NAME = 'gemini-3-flash-preview'; // Using Gemini 3 Flash Preview

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

// --- IN-MEMORY STORE (Replacing Redis for Demo Simplicity) ---
const inMemoryStore = {}; 
// Structure: { [sessionId]: { audio: [], photos: [], timer: null } }

const consumer = kafka.consumer({ groupId: 'tourflow-ai-group' });
const producer = kafka.producer();

const connect = async () => {
  await consumer.connect();
  await producer.connect();
  console.log('AI Processor Connected to Kafka (In-Memory Buffer)');

  // Subscribe to raw topics
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
  if (!inMemoryStore[sessionId]) {
    inMemoryStore[sessionId] = { audio: [], photos: [], timer: null };
  }

  const session = inMemoryStore[sessionId];

  if (topic === 'tour-audio-chunks') {
    session.audio.push(data);
  } else if (topic === 'tour-photos-raw') {
    session.photos.push(data);
  }

  // If no timer is running, start one to process the window
  if (!session.timer) {
    session.timer = setTimeout(() => processWindow(sessionId), BATCH_WINDOW_MS);
    console.log(`Started processing window for session ${sessionId}`);
  }
};

const processWindow = async (sessionId) => {
  const session = inMemoryStore[sessionId];
  if (!session) return;

  // Clear timer reference
  session.timer = null;

  try {
    const currentAudio = [...session.audio];
    const currentPhotos = [...session.photos];

    // Clear the memory for this session
    session.audio = [];
    session.photos = [];

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