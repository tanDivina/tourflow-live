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

  // Subscribe to enriched topic
  await consumer.subscribe({ topics: ['enriched-media-stream'], fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const value = JSON.parse(message.value.toString());
      const sessionId = value.session_id || value.sessionId;
      
      await handleIncomingData(sessionId, topic, value);
    },
  });
};

const handleIncomingData = async (sessionId, topic, data) => {
  if (!inMemoryStore[sessionId]) {
    inMemoryStore[sessionId] = { media: [], timer: null };
  }

  const session = inMemoryStore[sessionId];
  session.media.push(data);

  // If no timer is running, start one to process the window
  if (!session.timer) {
    session.timer = setTimeout(() => processWindow(sessionId), BATCH_WINDOW_MS);
    console.log(`Started processing window for session ${sessionId}`);
  }
};

/**
 * Uses Gemini to moderate guest content.
 * @param {string} base64Data - The image data.
 * @returns {Promise<boolean>} - True if appropriate and high quality.
 */
const moderateContent = async (base64Data) => {
  try {
    const result = await model.generateContent([
      { text: "Analyze this photo. Is it appropriate for a family-friendly tour gallery and of decent quality? Respond with only 'TRUE' or 'FALSE'." },
      { inlineData: { mimeType: "image/jpeg", data: base64Data } }
    ]);
    const text = result.response.text().toUpperCase();
    return text.includes('TRUE');
  } catch (err) {
    console.error('Moderation error:', err);
    return false; // Safety first
  }
};

const processWindow = async (sessionId) => {
  const session = inMemoryStore[sessionId];
  if (!session) return;

  session.timer = null;

  try {
    let currentMedia = [...session.media];
    session.media = [];

    if (currentMedia.length === 0) return;

    // --- NEW: GUEST MODERATION ---
    const moderatedMedia = [];
    for (const item of currentMedia) {
      if (item.source === 'guest') {
        const isAppropriate = await moderateContent(item.media_url);
        if (isAppropriate) moderatedMedia.push(item);
        else console.log(`[MODERATION] Dropped inappropriate guest photo in session ${sessionId}`);
      } else {
        moderatedMedia.push(item);
      }
    }
    currentMedia = moderatedMedia;
    if (currentMedia.length === 0) return;
    // ----------------------------

    console.log(`Processing window for ${sessionId}: ${currentMedia.length} moderated items`);
    
    // ... rest of the Gemini processing logic


    // 1. Prepare parts for Gemini
    const parts = [];

    // Get the latest blueprint info from the last message in this window
    const lastItem = currentMedia[currentMedia.length - 1];
    const stopName = lastItem.stop_name || 'Unknown Stop';
    const contextHint = lastItem.context_hint || 'Keep it engaging';

    // Prompt
    parts.push({
      text: `You are the AI producer for "TourFlow", a live interactive tour feed.
      Your goal is to create engaging, real-time updates for an audience following along remotely.
      
      SECTION HEADER: ${stopName}
      CONTEXT HINT: ${contextHint}
      
      You are no longer guessing the location. Use the provided stop name as the section header. 
      Use the context hint to ground your storytelling. If the photos don't perfectly match the hint, 
      trust the hint (the Blueprint is truth).
      
      1. **Analyze:** Extract key facts and the story from the audio chunks and photos.
      2. **Curate:** Review all photos. Select the *single best* image that matches the story. 
      3. **Write:** A specific, engaging social-media style caption (Instagram/TikTok style).
         - Use emojis 🌍✨📸.
         - Keep it under 280 characters.
         - Make it feel "live".
      
      Output strictly valid JSON:
      { 
        "timestamp": "ISO_STRING", 
        "caption": "Your engaging caption here...", 
        "highlight_image_index": 0, // Index in the provided media list (integer)
        "guest_credit": "Name or null" 
      }`
    });

    // Add Media (Photos/Audio)
    currentMedia.forEach((item) => {
      // Note: In the Flink SQL join, we assumed item.media_url contains the data
      // For this demo, we'll assume it's the base64 data if it doesn't look like a URL
      const isPhoto = item.media_url && (item.media_url.length > 500 || !item.media_url.startsWith('http'));
      
      if (isPhoto) {
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: item.media_url
          }
        });
      } else {
        // Handle audio if needed, or other media
      }
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