const { Kafka } = require('kafkajs');
require('dotenv').config();

const kafka = new Kafka({
  clientId: 'tourflow-blueprint-manager',
  brokers: [process.env.CONFLUENT_BOOTSTRAP_SERVER],
  ssl: true,
  sasl: {
    mechanism: 'plain',
    username: process.env.CONFLUENT_API_KEY,
    password: process.env.CONFLUENT_API_SECRET,
  },
});

const producer = kafka.producer();

const BLUEPRINT = {
  'demo-session': [
    {
      stopId: 'stop-1',
      name: '🌱 Cacao Nursery',
      context_hint: 'We are looking at baby cacao trees. They need shade and careful watering.',
      gps: { lat: 9.65, lng: -85.05 }
    },
    {
      stopId: 'stop-2',
      name: '🍫 Fermentation Station',
      context_hint: 'This is where the magic happens. The beans are fermenting in wooden boxes to develop flavor.',
      gps: { lat: 9.651, lng: -85.051 }
    },
    {
      stopId: 'stop-3',
      name: '☕ Drying Deck',
      context_hint: 'Beans are spread out under the sun. We rake them to ensure even drying.',
      gps: { lat: 9.652, lng: -85.052 }
    }
  ]
};

const publishBlueprint = async (sessionId) => {
  await producer.connect();
  console.log(`\n🔵 [BLUEPRINT MANAGER] Connected to TourFlow Control Plane`);
  console.log(`📋 Loading Blueprint for Session: ${sessionId}...
`);

  const stops = BLUEPRINT[sessionId] || BLUEPRINT['demo-session'];

  for (const stop of stops) {
    console.log(`   📍 Defining Stop: ${stop.name}`);
    console.log(`      └─ Context: "${stop.context_hint}"`);
    
    // Publish to 'tour-blueprints' so the SQL Join works
    const payload = {
      // Flink SQL expects snake_case based on enrichment.sql
      session_id: sessionId,
      stop_id: stop.stopId,
      stop_name: stop.name,
      context_hint: stop.context_hint,
      
      // Keeping camelCase for potential other consumers
      sessionId: sessionId,
      stopId: stop.stopId,
      timestamp: new Date().toISOString()
    };

    await producer.send({
      topic: 'tour-blueprints',
      messages: [
        {
          key: sessionId, 
          value: JSON.stringify(payload),
        },
      ],
    });

    console.log(`      ✅ Published to Kafka: tour-blueprints`);
    
    // Simulate a slight delay as if the guide is planning the route
    await new Promise(r => setTimeout(r, 800));
  }

  console.log(`\n✅ Blueprint Active! The AI Context Engine is now synchronized.`);
  console.log(`   Waiting for Guide/Guest media uploads...`);
  await producer.disconnect();
};

// Run
if (require.main === module) {
  publishBlueprint('demo-session').catch(console.error);
}