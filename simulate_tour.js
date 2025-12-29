const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

const SESSION_ID = 'demo-session';
const SERVER_URL = 'http://localhost:3001/upload';

// Paths (Using absolute paths to be safe)
const AUDIO_PATH = path.resolve('/Users/dorienvandenabbeele/Downloads/Glen.mp3');
const IMAGE_PATH = path.resolve('/Users/dorienvandenabbeele/Desktop/Screenshot 2025-11-12 at 17.13.03.png');

async function upload(filePath, type, source = 'guide') {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }

  const form = new FormData();
  form.append('sessionId', SESSION_ID);
  form.append('type', type);
  form.append('source', source);
  form.append('media', fs.createReadStream(filePath));

  console.log(`Uploading ${type} from ${filePath}...`);
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
  // Upload Audio
  await upload(AUDIO_PATH, 'audio');
  
  // Wait a bit
  console.log('Waiting 2 seconds before uploading photo...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Upload Photo
  await upload(IMAGE_PATH, 'photo');

  console.log('Simulation sent. Check the AI Processor logs and the Frontend Feed!');
}

run();
