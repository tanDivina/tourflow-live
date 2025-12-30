# 🌍 TourFlow Live

**TourFlow Live** is a real-time, AI-powered interactive tour feed application. It allows guides and guests to upload audio and photos from a tour, which are then processed by **Google Gemini 3 Flash** to automatically generate an engaging, social-media style live feed for remote followers.

## 🏗 Architecture

The system consists of three main components connected via **Confluent Cloud (Apache Kafka)**:

1.  **Frontend (Next.js):** 
    - Provides the UI for the Live Feed and Upload Controls (Audio Recording, Photo Upload).
    - Connects to the Backend via SSE (Server-Sent Events) for real-time updates.
2.  **Backend API (Express):**
    - Handles file uploads and publishes raw media to Kafka topics (`tour-audio-chunks`, `tour-photos-raw`).
    - Consumes the processed `tour-live-feed` topic and pushes updates to the frontend via SSE.
3.  **AI Processor (Node.js):**
    - Consumes raw media from Kafka.
    - Buffers data (Windowing) and sends it to **Google Gemini**.
    - Gemini analyzes audio context + photos, selects the best image, and writes a caption.
    - Publishes the result to `tour-live-feed`.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- [Confluent CLI](https://docs.confluent.io/confluent-cli/current/install.html) (for infrastructure setup)
- A Google Cloud Project with **Gemini API** access.

### 1. Installation

```bash
# Install root dependencies (Backend & AI Processor)
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Infrastructure Setup

You can set up the required Kafka topics and API keys automatically using the included script.

1.  Log in to Confluent Cloud:
    ```bash
    confluent login --save
    ```
2.  Run the setup script:
    ```bash
    ./setup_infra.sh
    ```
3.  The script will output `CONFLUENT_BOOTSTRAP_SERVER`, `CONFLUENT_API_KEY`, and `CONFLUENT_API_SECRET`.

### 3. Configuration

Create a `.env` file in the root `tourflow-live` directory with the following credentials:

```env
# Confluent Cloud (Kafka)
CONFLUENT_BOOTSTRAP_SERVER=<from_setup_script>
CONFLUENT_API_KEY=<from_setup_script>
CONFLUENT_API_SECRET=<from_setup_script>

# Google Gemini
GEMINI_API_KEY=<your_google_ai_studio_key>

# Server
PORT=3001
```

### 4. Running the Application

You will need to run three processes (ideally in separate terminal tabs):

**Terminal 1: Backend Server**
```bash
node server.js
```

**Terminal 2: AI Processor**
```bash
node ai_processor.js
```

**Terminal 3: Frontend**
```bash
cd frontend
npm run dev
```

Visit `http://localhost:3000` to see the application.

## 🛠 Features

- **Live Audio Transcription & Context:** The AI listens to the guide's audio to understand the tour's story.
- **Smart Photo Selection:** It compares guide vs. guest photos and picks the best match for the moment.
- **Auto-Captioning:** Generates Instagram-style captions with emojis.
- **Real-time Feed:** Updates appear instantly on connected clients.
