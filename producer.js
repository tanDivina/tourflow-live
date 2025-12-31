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
 * @param {string} stopId - ID of the current stop from the Blueprint.
 * @param {string} type - 'audio' or 'photo'.
 * @param {Buffer} dataBuffer - The raw file buffer.
 * @param {Object} metadata - Additional info (e.g., user type, timestamp, location).
 */
const publishTourMedia = async (sessionId, stopId, type, dataBuffer, metadata) => {
  const topic = type === 'audio' ? 'tour-audio-chunks' : 'tour-photos-raw';

  try {
    const payload = {
      sessionId,
      stopId,
      source: metadata.source || 'guide', // Flattened for Flink
      type,
      data: dataBuffer.toString('base64'),
      event_timestamp: new Date().toISOString(), // Renamed for Flink
      metadata,
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

    console.log(`[${type}] Sent to ${topic} for session ${sessionId} (Stop: ${stopId})`);
  } catch (error) {
    console.error(`Error publishing ${type}:`, error);
  }
};

/**
 * Publishes a Blueprint Update (e.g., activating a stop) to Kafka.
 * @param {string} sessionId 
 * @param {string} stopId 
 * @param {Object} metadata 
 */
const publishBlueprintUpdate = async (sessionId, stopId, metadata = {}) => {
  const topic = 'tour-blueprints';
  try {
    const payload = {
      sessionId,
      stopId,
      action: 'activate',
      timestamp: new Date().toISOString(),
      ...metadata
    };

    await producer.send({
      topic,
      messages: [
        {
          key: sessionId, // Key by session to ensure ordering
          value: JSON.stringify(payload),
        },
      ],
    });
    console.log(`[BLUEPRINT] Activated Stop ${stopId} for session ${sessionId}`);
  } catch (error) {
    console.error('Error publishing blueprint update:', error);
  }
};

// Example usage if run directly
if (require.main === module) {
  (async () => {
    await connectProducer();
    // Simulate an audio chunk at Stop 1
    await publishTourMedia('session-123', 'stop-1', 'audio', Buffer.from('mock-audio-data'), { duration: 30 });
    // Simulate a photo at Stop 2
    await publishTourMedia('session-123', 'stop-2', 'photo', Buffer.from('mock-photo-data'), { source: 'guide' });
  })();
}

module.exports = { connectProducer, publishTourMedia, publishBlueprintUpdate };
