const { Kafka } = require('kafkajs');
require('dotenv').config();

const kafka = new Kafka({
  clientId: 'admin-client',
  brokers: [process.env.CONFLUENT_BOOTSTRAP_SERVER],
  ssl: true,
  sasl: {
    mechanism: 'plain',
    username: process.env.CONFLUENT_API_KEY,
    password: process.env.CONFLUENT_API_SECRET,
  },
});

const admin = kafka.admin();

const createTopics = async () => {
  try {
    console.log('Connecting to Kafka Admin...');
    await admin.connect();
    console.log('Connected!');

    const topics = [
      { topic: 'tour-audio-chunks', numPartitions: 1, replicationFactor: 3 },
      { topic: 'tour-photos-raw', numPartitions: 1, replicationFactor: 3 },
      { topic: 'tour-live-feed', numPartitions: 1, replicationFactor: 3 },
      { 
        topic: 'tour-blueprints', 
        numPartitions: 1, 
        replicationFactor: 3,
        configEntries: [{ name: 'cleanup.policy', value: 'compact' }]
      }
    ];
    console.log(`Creating topics: ${topics.map(t => t.topic).join(', ')}...`);

    await admin.createTopics({
      topics: topics,
      waitForLeaders: true,
    });

    console.log('Topics created successfully!');
  } catch (err) {
    console.error('Error creating topics:', err);
  } finally {
    await admin.disconnect();
  }
};

createTopics();
