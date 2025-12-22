// producer.js
// Handles ingesting media from the Guide/Guest clients and pushing to Confluent Cloud.

const { Kafka } = require('kafkajs');
require('dotenv').config();

// Initialize Kafka Client
const kafka = new Kafka({
  clientId: 'tourflow-producer',
  brokers: [process.env.CONFLUENT_BOOTSTRAP_SERVER],
  ssl: true,
  sasl: {
    mechanism: 'plain',
    username: process.env.CONFLUENT_API_KEY,
    password: process.env.CONFLUENT_API_SECRET,
  },
});

const producer = kafka.producer();

const connectProducer = async () => {
  await producer.connect();
  console.log('Producer connected to Confluent Cloud');
};

/**
 * Publishes media to the appropriate Kafka topic.
 * @param {string} sessionId - Unique ID for the tour session.
 * @param {string} type - 'audio' or 'photo'.
 * @param {Buffer} dataBuffer - The raw file buffer.
 * @param {Object} metadata - Additional info (e.g., user type, timestamp, location).
 */
const publishTourMedia = async (sessionId, type, dataBuffer, metadata) => {
  const topic = type === 'audio' ? 'tour-audio-chunks' : 'tour-photos-raw';

  try {
    const payload = {
      sessionId,
      type,
      data: dataBuffer.toString('base64'), // Encoding binary for simple transport in JSON
      metadata,
      timestamp: new Date().toISOString(),
    };

    await producer.send({
      topic,
      messages: [
        {
          key: sessionId,
          value: JSON.stringify(payload),
        },
      ],
    });

    console.log(`[${type}] Sent to ${topic} for session ${sessionId}`);
  } catch (error) {
    console.error(`Error publishing ${type}:`, error);
  }
};

// Example usage if run directly
if (require.main === module) {
  (async () => {
    await connectProducer();
    // Simulate an audio chunk
    await publishTourMedia('session-123', 'audio', Buffer.from('mock-audio-data'), { duration: 30 });
    // Simulate a photo
    await publishTourMedia('session-123', 'photo', Buffer.from('mock-photo-data'), { source: 'guide' });
  })();
}

module.exports = { connectProducer, publishTourMedia };
