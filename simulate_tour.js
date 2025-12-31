const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

const SESSION_ID = 'demo-session';
const SERVER_URL = 'http://localhost:3001/upload';

// Paths (Placeholders - please update to existing files on your system)
const AUDIO_PATH = path.resolve('sample-audio.mp3'); 
const IMAGE_PATH = path.resolve('sample-photo.jpg');

async function upload(filePath, type, stopId, source = 'guide') {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}. Please update simulate_tour.js with valid paths.`);
    return;
  }

  const form = new FormData();
  form.append('sessionId', SESSION_ID);
  form.append('stopId', stopId);
  form.append('type', type);
  form.append('source', source);
  form.append('media', fs.createReadStream(filePath));

  console.log(`Uploading ${type} for ${stopId} from ${filePath}...`);
  try {
    const response = await axios.post(SERVER_URL, form, {
      headers: form.getHeaders(),
    });
    console.log(`${type} upload success:`, response.data);
  } catch (error) {
    console.error(`${type} upload failed:`, error.response?.data || error.message);
  }
}

async function run() {
  console.log('--- Starting Structured Tour Simulation ---');
  
  // Upload Audio at Stop 1
  await upload(AUDIO_PATH, 'audio', 'stop-1');
  
  // Wait a bit
  console.log('Waiting 2 seconds before uploading photo...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Upload Photo at Stop 1
  await upload(IMAGE_PATH, 'photo', 'stop-1');

  console.log('\nSimulation sent. Ensure blueprint_manager.js has run first!');
}

run();
