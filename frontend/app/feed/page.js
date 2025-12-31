'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function FeedContent() {
  const searchParams = useSearchParams();
  const initialSessionId = searchParams.get('session') || 'demo-session';

  const [sessionId, setSessionId] = useState(initialSessionId);
  const [feed, setFeed] = useState([]);
  const [viewMode, setViewMode] = useState('feed'); // 'feed' | 'gallery'
  const [isRecording, setIsRecording] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null); // For Gallery Modal
  
  // Audio Refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // --- FETCH HISTORY & SSE CONNECTION ---
  useEffect(() => {
    let eventSource;
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://tourflow-backend-0376136188.us-central1.run.app';

    const fetchHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const res = await fetch(`${backendUrl}/api/gallery/${sessionId}`);
        if (res.ok) {
          const history = await res.json();
          history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          setFeed(history);
        }
      } catch (err) {
        console.error('Error fetching history:', err);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    const connectSSE = () => {
      setConnectionStatus('connecting');
      eventSource = new EventSource(`${backendUrl}/events`);
      eventSource.onopen = () => setConnectionStatus('connected');
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.sessionId === sessionId) {
            setFeed((prev) => {
              const exists = prev.some(p => p.timestamp === data.timestamp && p.caption === data.caption);
              if (exists) return prev;
              return [data, ...prev];
            });
          }
        } catch (err) {
          console.error('SSE Error:', err);
        }
      };
      eventSource.onerror = (err) => {
        setConnectionStatus('disconnected');
        eventSource.close();
        setTimeout(connectSSE, 5000);
      };
    };

    fetchHistory().then(connectSSE);
    return () => { if (eventSource) eventSource.close(); };
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
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://tourflow-backend-0376136188.us-central1.run.app';
      const res = await fetch(`${backendUrl}/upload`, { method: 'POST', body: formData });
      if (res.ok) {
        setUploadStatus(`${type} uploaded!`);
        setTimeout(() => setUploadStatus(''), 3000);
      }
    } catch (err) {
      setUploadStatus(`Upload failed`);
    }
  };

  // --- AUDIO LOGIC ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
        uploadMedia(audioBlob, 'audio', 'guide');
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) { setUploadStatus('Mic denied'); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <header className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
             <Link href="/" className="text-gray-400 hover:text-gray-600">←</Link>
            <h1 className="text-xl font-bold flex items-center gap-2">🌍 TourFlow <span className="text-red-500 text-sm animate-pulse">● LIVE</span></h1>
            <div className={`text-xs px-2 py-1 rounded-full ${connectionStatus === 'connected' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {connectionStatus === 'connected' ? 'Online' : 'Connecting...'}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button onClick={() => setViewMode('feed')} className={`px-3 py-1 text-sm rounded-md ${viewMode === 'feed' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>Feed</button>
              <button onClick={() => setViewMode('gallery')} className={`px-3 py-1 text-sm rounded-md ${viewMode === 'gallery' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>Gallery</button>
            </div>
            <input value={sessionId} onChange={(e) => setSessionId(e.target.value)} className="border rounded px-2 py-1 text-sm w-24 sm:w-auto" />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <h2 className="text-lg font-semibold text-gray-700">{viewMode === 'feed' ? 'Live Updates' : 'Photo Gallery'}</h2>
          
          {viewMode === 'feed' ? (
            <div className="space-y-6">
              {feed.map((post, idx) => (
                <article key={idx} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  {post.image && <img src={`data:image/jpeg;base64,${post.image}`} className="w-full aspect-video object-cover" />}
                  <div className="p-5">
                    <div className="flex justify-between text-xs text-gray-400 mb-2">
                      <span className="text-blue-600 font-bold uppercase">Update</span>
                      <time>{new Date(post.timestamp).toLocaleTimeString()}</time>
                    </div>
                    <p className="text-gray-800 text-lg">{post.caption}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {feed.filter(p => p.image).map((post, idx) => (
                <div key={idx} onClick={() => setSelectedPost(post)} className="relative aspect-square cursor-pointer overflow-hidden rounded-lg group">
                  <img src={`data:image/jpeg;base64,${post.image}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                    <p className="text-white text-xs line-clamp-1">{post.caption}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="md:col-span-1 space-y-6">
          <div className="sticky top-24 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center space-y-4">
              <h3 className="font-semibold text-gray-700">Audio Guide</h3>
              <button onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording}
                className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto transition-all ${isRecording ? 'bg-red-500 ring-8 ring-red-100 scale-110' : 'bg-gray-100 text-red-500'}`}>
                {isRecording ? <span className="text-white">■</span> : <span className="text-3xl">🎤</span>}
              </button>
              <div className="text-xs text-gray-400">{isRecording ? 'Recording...' : 'Hold to speak'}</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center space-y-4">
              <h3 className="font-semibold text-gray-700">Snap & Share</h3>
              <label className="cursor-pointer block border-2 border-dashed rounded-lg p-8 hover:bg-gray-50">
                <span className="text-3xl">📷</span>
                <input type="file" accept="image/*" onChange={(e) => uploadMedia(e.target.files[0], 'photo')} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedPost(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <img src={`data:image/jpeg;base64,${selectedPost.image}`} className="w-full max-h-[60vh] object-contain bg-black" />
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">AI Story Snippet</p>
                  <time className="text-sm text-gray-400">{new Date(selectedPost.timestamp).toLocaleString()}</time>
                </div>
                <button onClick={() => setSelectedPost(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
              </div>
              <p className="text-gray-800 text-xl leading-relaxed">{selectedPost.caption}</p>
            </div>
          </div>
        </div>
      )}
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