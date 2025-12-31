const { Kafka } = require('kafkajs');
require('dotenv').config();

// Configuration
const kafka = new Kafka({
  clientId: 'tourflow-history-fetcher',
  brokers: [process.env.CONFLUENT_BOOTSTRAP_SERVER],
  ssl: true,
  sasl: {
    mechanism: 'plain',
    username: process.env.CONFLUENT_API_KEY,
    password: process.env.CONFLUENT_API_SECRET,
  },
});

/**
 * Fetches the complete history of a specific session from the tour-live-feed topic.
 * 
 * Strategy:
 * 1. Get the latest offset (High Watermark) for the topic.
 * 2. Consume from the beginning (Offset 0).
 * 3. Filter messages matching the sessionId.
 * 4. Stop consuming when we reach the High Watermark.
 * 
 * @param {string} sessionId - The session ID to fetch history for.
 * @returns {Promise<Array>} - Array of event objects.
 */
async function fetchSessionHistory(sessionId) {
  const admin = kafka.admin();
  const consumer = kafka.consumer({ groupId: `history-fetcher-${Date.now()}` }); // Unique group to avoid conflicts
  const history = [];
  const TOPIC = 'tour-live-feed';

  try {
    // 1. Get the High Watermark (latest offset)
    await admin.connect();
    const topicOffsets = await admin.fetchTopicOffsets(TOPIC);
    const highWatermark = topicOffsets[0].offset; // Assuming 1 partition for simplicity
    await admin.disconnect();

    if (highWatermark === '0') {
      return []; // Topic is empty
    }

    console.log(`[History] Fetching history for ${sessionId}. High Watermark: ${highWatermark}`);

    // 2. Connect Consumer and Seek to Beginning
    await consumer.connect();
    await consumer.subscribe({ topic: TOPIC, fromBeginning: true });

    // 3. Consume and Filter
    // We use a Promise wrapper to handle the "stop condition"
    await new Promise((resolve) => {
      consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          const offset = message.offset;
          
          try {
            const value = JSON.parse(message.value.toString());
            
            // Filter by Session ID
            if (value.sessionId === sessionId) {
              history.push(value);
            }
          } catch (e) {
            console.warn('[History] Failed to parse message:', e.message);
          }

          // 4. Check if we've reached the end
          // Note: Offsets are strings in KafkaJS. 
          // We stop when we process the message *before* the high watermark (since HWM is the *next* offset to be written)
          if (BigInt(offset) >= BigInt(highWatermark) - 1n) {
            consumer.stop(); // Stop the consumer loop
            resolve();      // Resolve the promise to return data
          }
        },
      });
    });

  } catch (error) {
    console.error('[History] Error fetching history:', error);
  } finally {
    try {
      await consumer.disconnect();
    } catch (e) {
      // Ignore disconnect errors
    }
  }

  console.log(`[History] Found ${history.length} items for session ${sessionId}`);
  return history;
}

// Example Usage (if run directly)
if (require.main === module) {
  const sessionId = process.argv[2] || 'demo-session';
  fetchSessionHistory(sessionId).then(data => {
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
  });
}

module.exports = { fetchSessionHistory };
