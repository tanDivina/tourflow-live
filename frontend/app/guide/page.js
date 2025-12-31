'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Mock Blueprint Data (Static for Demo, but activation is Real)
const BLUEPRINT_STOPS = [
  {
    id: 'stop-1',
    name: '🌱 Cacao Nursery',
    context: 'Baby trees, grafting, shade management.',
    status: 'pending' 
  },
  {
    id: 'stop-2',
    name: '🍫 Fermentation Station',
    context: 'Wooden boxes, heat generation, flavor development.',
    status: 'pending'
  },
  {
    id: 'stop-3',
    name: '☀️ Drying Deck',
    context: 'Solar drying, raking beans, quality check.',
    status: 'pending'
  },
  {
    id: 'stop-4',
    name: '🍪 Roasting & Grinding',
    context: 'Maillard reaction, shell removal, making paste.',
    status: 'pending'
  }
];

export default function GuidePanel() {
  const router = useRouter();
  const [activeStopId, setActiveStopId] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const activateStop = async (stop) => {
    setIsSyncing(true);
    setActiveStopId(stop.id);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://tourflow-backend-kkosdg4sda-uc.a.run.app';
      
      // REAL Backend Call to Kafka
      const res = await fetch(`${backendUrl}/api/blueprint/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'demo-session', // Hardcoded for demo simplicity
          stopId: stop.id,
          stopName: stop.name
        })
      });

      if (!res.ok) throw new Error('Failed to activate stop');

      // Success! Navigate to the "Live Feed" as the Guide
      // We pass the active stop so the upload button knows what to tag
      router.push(`/feed?session=demo-session&stopId=${stop.id}`);

    } catch (err) {
      console.error(err);
      alert('Failed to sync with Blueprint Engine');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold flex items-center gap-2">
            🗺️ Guide Control <span className="text-xs font-normal text-gray-400">v1.0</span>
          </h1>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-xs font-medium text-green-700">System Ready</span>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        
        {/* SESSION INFO */}
        <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <div className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">Active Session</div>
            <div className="text-2xl font-bold">Finca Montezuma Tour</div>
            <div className="mt-4 flex gap-3 text-sm">
              <div className="bg-white/20 px-3 py-1 rounded-full">👥 12 Guests</div>
              <div className="bg-white/20 px-3 py-1 rounded-full">⏱️ 00:00:00</div>
            </div>
          </div>
          <div className="absolute top-0 right-0 p-4 opacity-20 text-6xl">🌍</div>
        </div>

        {/* GUEST ACCESS QR */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
          <h2 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-4">
            Guest Access (Scan to Join)
          </h2>
          <div className="bg-gray-50 p-4 rounded-xl inline-block mb-3 border border-gray-100">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent('https://tourflow-frontend-kkosdg4sda-uc.a.run.app/feed?session=demo-session')}`} 
              alt="Guest QR Code"
              className="w-40 h-40"
            />
          </div>
          <p className="text-xs text-gray-400 font-medium leading-relaxed">
            Point guests to this screen or share:<br/>
            <span className="text-blue-500 font-bold select-all">tourflow.live/feed</span>
          </p>
        </div>

        {/* BLUEPRINT LIST */}
        <div>
          <h2 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-4 px-1">
            Tour Blueprint (Context Engine)
          </h2>
          
          <div className="space-y-3">
            {BLUEPRINT_STOPS.map((stop, idx) => {
              const isActive = activeStopId === stop.id;

              return (
                <button
                  key={stop.id}
                  onClick={() => activateStop(stop)}
                  disabled={isSyncing}
                  className={`
                    w-full text-left p-4 rounded-xl border-2 transition-all duration-200 relative overflow-hidden
                    ${isActive 
                      ? 'border-blue-500 bg-blue-50 shadow-md transform scale-[1.02]' 
                      : 'border-white bg-white shadow-sm hover:border-gray-200'}
                  `}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-xs font-bold px-2 py-1 rounded-md ${isActive ? 'bg-blue-200 text-blue-800' : 'bg-gray-100 text-gray-500'}`}>
                      STOP {idx + 1}
                    </span>
                    {isActive && <span className="text-xs text-blue-600 font-bold animate-pulse">● ACTIVE</span>}
                  </div>
                  
                  <h3 className={`text-lg font-bold mb-1 ${isActive ? 'text-blue-900' : 'text-gray-800'}`}>
                    {stop.name}
                  </h3>
                  
                  <p className="text-sm text-gray-500 leading-snug">
                    {stop.context}
                  </p>

                  {/* Progress Line */}
                  {idx !== BLUEPRINT_STOPS.length - 1 && (
                    <div className="absolute left-8 bottom-0 w-0.5 h-4 bg-gray-200 -mb-4 z-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

      </main>
    </div>
  );
}
