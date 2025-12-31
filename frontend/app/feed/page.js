'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function FeedContent() {
  const searchParams = useSearchParams();
  const initialSessionId = searchParams.get('session') || 'demo-session';

  const [sessionId, setSessionId] = useState(initialSessionId);
  const [feed, setFeed] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // 'connecting', 'connected', 'disconnected'
  
  // Audio Refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // --- SSE CONNECTION ---
  useEffect(() => {
    let eventSource;
    
    const connectSSE = () => {
      console.log('Connecting to SSE...');
      setConnectionStatus('connecting');
      eventSource = new EventSource('https://tourflow-backend-81532538916.us-central1.run.app/events');

      eventSource.onopen = () => {
        setConnectionStatus('connected');
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Only show events for current session
          if (data.sessionId === sessionId) {
            setFeed((prev) => [data, ...prev]);
          }
        } catch (err) {
          console.error('SSE Error:', err);
        }
      };

      eventSource.onerror = (err) => {
        console.error('SSE Connection Error', err);
        setConnectionStatus('disconnected');
        eventSource.close();
        // Retry after 5s
        setTimeout(connectSSE, 5000);
      };
    };

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [sessionId]);


  // --- UPLOAD HANDLER ---
  const uploadMedia = async (file, type, source = 'guide') => {
    setUploadStatus(`Uploading ${type}...`);
    
    const formData = new FormData();
    formData.append('sessionId', sessionId);
    formData.append('type', type);
    formData.append('source', source);
    formData.append('media', file);

    try {
      const res = await fetch('https://tourflow-backend-81532538916.us-central1.run.app/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setUploadStatus(`${type} uploaded successfully!`);
        setTimeout(() => setUploadStatus(''), 3000);
      } else {
        throw new Error('Upload failed');
      }
    } catch (err) {
      console.error(err);
      setUploadStatus(`Error uploading ${type}`);
    }
  };


  // --- AUDIO LOGIC ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
        uploadMedia(audioBlob, 'audio', 'guide');
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access denied:', err);
      setUploadStatus('Mic access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Stop all tracks to release mic
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };


  // --- PHOTO LOGIC ---
  const handlePhotoSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      uploadMedia(e.target.files[0], 'photo', 'guide');
    }
  };


  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
             <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors">
               ←
             </Link>
            <h1 className="text-xl font-bold flex items-center gap-2">
              🌍 TourFlow <span className="text-red-500 text-sm font-normal animate-pulse">● LIVE</span>
            </h1>
            {/* Connection Status Indicator */}
            <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-100 text-green-700' : 
              connectionStatus === 'connecting' ? 'bg-yellow-100 text-yellow-700' : 
              'bg-red-100 text-red-700'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' : 
                connectionStatus === 'connecting' ? 'bg-yellow-500' : 
                'bg-red-500'
              }`} />
              {connectionStatus === 'connected' ? 'Online' : connectionStatus === 'connecting' ? 'Connecting...' : 'Offline'}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Session:</span>
            <input 
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="border rounded px-2 py-1 text-sm bg-gray-100 focus:bg-white transition-colors outline-none focus:ring-2 ring-blue-500"
            />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* LEFT: LIVE FEED */}
        <div className="md:col-span-2 space-y-6">
          <h2 className="text-lg font-semibold text-gray-700">Live Updates</h2>
          
          {feed.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
              <p className="text-gray-400">Waiting for updates...</p>
            </div>
          )}

          {feed.map((post, idx) => (
            <article key={idx} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* IMAGE */}
              {post.image && (
                <div className="relative aspect-video bg-gray-100">
                  {/* Assuming image is base64 from backend */}
                  <img 
                    src={`data:image/jpeg;base64,${post.image}`} 
                    alt="Tour update" 
                    className="w-full h-full object-cover"
                  />
                  {post.credit && (
                    <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                      📸 {post.credit}
                    </div>
                  )}
                </div>
              )}

              {/* CONTENT */}
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                    UPDATE
                  </span>
                  <time className="text-xs text-gray-400">
                    {new Date(post.timestamp).toLocaleTimeString()}
                  </time>
                </div>
                <p className="text-gray-800 leading-relaxed text-lg">
                  {post.caption}
                </p>
              </div>
            </article>
          ))}
        </div>


        {/* RIGHT: CONTROLS */}
        <div className="md:col-span-1 space-y-6">
          <div className="sticky top-24 space-y-6">
            
            {/* STATUS CARD */}
            {uploadStatus && (
              <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-lg text-sm font-medium animate-pulse">
                {uploadStatus}
              </div>
            )}

            {/* AUDIO RECORDER */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center space-y-4">
              <h3 className="font-semibold text-gray-700">Audio Guide</h3>
              <p className="text-xs text-gray-500">Hold to record commentary</p>
              
              <button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                className={`
                  w-20 h-20 rounded-full flex items-center justify-center mx-auto transition-all duration-200
                  ${isRecording 
                    ? 'bg-red-500 ring-8 ring-red-100 scale-110' 
                    : 'bg-gray-100 hover:bg-red-50 text-red-500 hover:scale-105'}
                `}
              >
                {isRecording ? (
                  <span className="text-3xl text-white animate-pulse">■</span>
                ) : (
                  <span className="text-3xl">🎤</span>
                )}
              </button>
              <div className="text-xs font-mono text-gray-400 h-4">
                {isRecording ? 'Recording...' : 'Ready'}
              </div>
            </div>

            {/* PHOTO UPLOAD */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center space-y-4">
              <h3 className="font-semibold text-gray-700">Snap & Share</h3>
              <p className="text-xs text-gray-500">Upload photos from the field</p>
              
              <label className="cursor-pointer block">
                <div className="w-full h-32 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-gray-50 transition-colors group">
                  <span className="text-3xl group-hover:scale-110 transition-transform">📷</span>
                  <span className="text-sm text-gray-400 group-hover:text-gray-600">Select Photo</span>
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handlePhotoSelect}
                  className="hidden" 
                />
              </label>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
}

export default function Feed() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading TourFlow...</div>}>
      <FeedContent />
    </Suspense>
  );
}