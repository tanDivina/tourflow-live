// server.js
// Express server to bridge Frontend <-> Confluent Kafka
// Handles media uploads and provides a real-time SSE stream for the Live Feed.

const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const { Kafka } = require('kafkajs');
const { connectProducer, publishTourMedia } = require('./producer');
const sharp = require('sharp');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(fileUpload());

// --- KAFKA CONSUMER FOR SSE ---
const kafka = new Kafka({
  clientId: 'tourflow-sse-bridge',
  brokers: [process.env.CONFLUENT_BOOTSTRAP_SERVER],
  ssl: true,
  sasl: {
    mechanism: 'plain',
    username: process.env.CONFLUENT_API_KEY,
    password: process.env.CONFLUENT_API_SECRET,
  },
});

const consumer = kafka.consumer({ groupId: 'tourflow-sse-group-' + Date.now() });
let clients = [];

// Send heartbeat pings every 20 seconds to keep SSE connections alive
// Many proxies/browsers timeout after 30-60s of inactivity.
setInterval(() => {
  clients.forEach(client => {
    client.res.write(': ping\n\n');
  });
}, 20000);

const startKafkaConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: 'tour-live-feed', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const data = JSON.parse(message.value.toString());
      console.log(`[SSE] Pushing update for session ${data.sessionId}`);
      
      // Send to all connected SSE clients
      clients.forEach(client => {
        client.res.write(`data: ${JSON.stringify(data)}

`);
      });
    },
  });
};

// --- ROUTES ---

// 1. SSE Endpoint
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  clients.push(newClient);

  console.log(`[SSE] Client ${clientId} connected`);

  req.on('close', () => {
    console.log(`[SSE] Client ${clientId} disconnected`);
    clients = clients.filter(c => c.id !== clientId);
  });
});

// 2. Media Upload Endpoint (Producer)
app.post('/upload', async (req, res) => {
  if (!req.files || !req.files.media) {
    return res.status(400).send('No media file uploaded.');
  }

  const { sessionId, stopId, type, source } = req.body;
  const mediaFile = req.files.media;
  let mediaData = mediaFile.data;
  let mimeType = mediaFile.mimetype;

  try {
    // Optimization: Resize photos to reduce Kafka message size
    if (type === 'photo') {
      try {
        mediaData = await sharp(mediaFile.data)
          .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toBuffer();
        mimeType = 'image/jpeg';
        console.log(`[UPLOAD] Resized photo for session ${sessionId} (${mediaFile.data.length} -> ${mediaData.length} bytes)`);
      } catch (sharpError) {
        console.warn('[UPLOAD] Failed to resize photo, sending original:', sharpError.message);
      }
    }

    await publishTourMedia(sessionId, stopId, type, mediaData, { source, mimeType });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- STARTUP ---
const start = async () => {
  await connectProducer();
  await startKafkaConsumer();
  
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

start().catch(console.error);
