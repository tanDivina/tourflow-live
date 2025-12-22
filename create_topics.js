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

    const topics = ['tour-audio-chunks', 'tour-photos-raw', 'tour-live-feed'];
    console.log(`Creating topics: ${topics.join(', ')}...`);

    const topicConfigs = topics.map(t => ({
      topic: t,
      numPartitions: 1,
      replicationFactor: 3 // Standard for Confluent Cloud
    }));

    await admin.createTopics({
      topics: topicConfigs,
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
