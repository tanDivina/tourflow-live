// blueprint_manager.js
// Publishes tour blueprints to the tour-blueprints compacted topic.

const { Kafka } = require('kafkajs');
require('dotenv').config();

const kafka = new Kafka({
  clientId: 'blueprint-manager',
  brokers: [process.env.CONFLUENT_BOOTSTRAP_SERVER],
  ssl: true,
  sasl: {
    mechanism: 'plain',
    username: process.env.CONFLUENT_API_KEY,
    password: process.env.CONFLUENT_API_SECRET,
  },
});

const producer = kafka.producer();

/**
 * Publishes a stop's blueprint data.
 * @param {string} sessionId - The tour session ID.
 * @param {string} stopId - The unique ID for this stop.
 * @param {Object} blueprintData - Data like stop_name, context_hint, etc.
 */
const publishBlueprint = async (sessionId, stopId, blueprintData) => {
  await producer.connect();
  try {
    const key = `${sessionId}:${stopId}`;
    const value = JSON.stringify({
      session_id: sessionId,
      stop_id: stopId,
      ...blueprintData,
      updated_at: new Date().toISOString(),
    });

    await producer.send({
      topic: 'tour-blueprints',
      messages: [{ key, value }],
    });

    console.log(`Blueprint published for stop ${stopId} in session ${sessionId}`);
  } catch (error) {
    console.error('Error publishing blueprint:', error);
  } finally {
    await producer.disconnect();
  }
};

// Example usage
if (require.main === module) {
  (async () => {
    const sessionId = 'session-123';
    const stops = [
      {
        stopId: 'stop-1',
        data: { stop_name: 'Cacao Harvest', context_hint: 'Explain how to identify ripe cacao pods' }
      },
      {
        stopId: 'stop-2',
        data: { stop_name: 'Fermentation Box', context_hint: 'Explain the chemistry of sweating beans' }
      }
    ];

    for (const stop of stops) {
      await publishBlueprint(sessionId, stop.stopId, stop.data);
    }
  })();
}

module.exports = { publishBlueprint };
