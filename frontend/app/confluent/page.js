'use client';

import Link from 'next/link';

export default function ConfluentPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* HEADER */}
      <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl hover:opacity-80 transition-opacity">
            🌍 TourFlow
          </Link>
          <div className="flex items-center gap-4 text-sm font-medium text-gray-600">
             <Link href="/feed" className="hover:text-blue-600 transition-colors">Live Feed</Link>
             <Link href="/guide" className="hover:text-blue-600 transition-colors">Guide Panel</Link>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-24 px-6 max-w-5xl mx-auto space-y-24">
        
        {/* HERO */}
        <div className="text-center space-y-6">
          <div className="inline-block p-4 rounded-full bg-blue-50 border border-blue-100 mb-4">
            <span className="text-4xl">🚀</span>
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-gray-900">
            Powered by <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Confluent Cloud</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            TourFlow isn't just a web app; it's a real-time event streaming platform. 
            Here is a deep dive into how we use Apache Kafka and Flink to orchestrate the AI tour experience.
          </p>
        </div>

        {/* ARCHITECTURE DIAGRAM */}
        <section className="space-y-8">
          <div className="border-l-4 border-blue-500 pl-6">
            <h2 className="text-3xl font-bold mb-2">The Data Pipeline</h2>
            <p className="text-gray-600">From the guide's microphone to the guest's screen in milliseconds.</p>
          </div>
          
          <div className="bg-gray-50 p-8 rounded-3xl border border-gray-200 shadow-inner">
            <div className="grid md:grid-cols-5 gap-4 items-center text-center">
              
              {/* Step 1 */}
              <div className="space-y-3">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-3xl mx-auto border border-gray-100">📱</div>
                <div className="font-bold text-sm">Client App</div>
                <div className="text-xs text-gray-500">Uploads Photo/Audio</div>
              </div>

              {/* Arrow */}
              <div className="text-gray-300 text-2xl">➔</div>

              {/* Step 2 */}
              <div className="space-y-3">
                <div className="w-16 h-16 bg-orange-50 rounded-2xl shadow-sm flex items-center justify-center text-3xl mx-auto border border-orange-100">🟠</div>
                <div className="font-bold text-sm">Kafka Topic</div>
                <div className="text-xs text-gray-500">tour-photos-raw</div>
              </div>

              {/* Arrow */}
              <div className="text-gray-300 text-2xl">➔</div>

              {/* Step 3 */}
              <div className="space-y-3">
                <div className="w-16 h-16 bg-purple-50 rounded-2xl shadow-sm flex items-center justify-center text-3xl mx-auto border border-purple-100">⚡</div>
                <div className="font-bold text-sm">Flink SQL</div>
                <div className="text-xs text-gray-500">Enrichment Join</div>
              </div>
              
            </div>
            
            <div className="grid md:grid-cols-5 gap-4 items-center text-center mt-8 pt-8 border-t border-gray-200 border-dashed">
               {/* Arrow Down/Right logic simulated */}
               <div className="md:col-span-2 text-right pr-12 text-gray-300 text-2xl hidden md:block">↴</div>
               <div className="md:col-span-3"></div>

               <div className="md:col-span-5 grid md:grid-cols-3 gap-4 items-center mt-4">
                  {/* Step 4 */}
                  <div className="space-y-3">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl shadow-sm flex items-center justify-center text-3xl mx-auto border border-blue-100">💎</div>
                    <div className="font-bold text-sm">AI Processor</div>
                    <div className="text-xs text-gray-500">Gemini 3 Flash</div>
                  </div>

                  {/* Arrow */}
                  <div className="text-gray-300 text-2xl">➔</div>

                  {/* Step 5 */}
                  <div className="space-y-3">
                    <div className="w-16 h-16 bg-green-50 rounded-2xl shadow-sm flex items-center justify-center text-3xl mx-auto border border-green-100">🌍</div>
                    <div className="font-bold text-sm">Live Feed</div>
                    <div className="text-xs text-gray-500">SSE Stream</div>
                  </div>
               </div>
            </div>
          </div>
        </section>

        {/* FEATURE 1: BLUEPRINT TOPIC */}
        <section className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
               <h2 className="text-3xl font-bold">1. The Blueprint Topic</h2>
               <p className="text-lg text-gray-600 leading-relaxed">
                 We treat the tour itinerary not as hardcoded config, but as a <span className="font-bold text-blue-600">Compact Kafka Topic</span>.
                 This allows us to update the tour plan in real-time without redeploying the app.
               </p>
               <ul className="space-y-3 text-gray-600">
                 <li className="flex items-center gap-2">✓ <strong>Log Compaction:</strong> Ensures we always have the latest state for every stop.</li>
                 <li className="flex items-center gap-2">✓ <strong>Replayable:</strong> New AI workers can re-read the plan instantly.</li>
               </ul>
            </div>
            <div className="bg-gray-900 rounded-xl overflow-hidden shadow-2xl ring-1 ring-gray-800">
              <div className="bg-gray-800 px-4 py-2 text-xs text-gray-400 font-mono border-b border-gray-700">blueprint_manager.js</div>
              <pre className="p-4 text-xs md:text-sm text-green-400 font-mono overflow-x-auto">
{`// Publishing the Tour Plan to Kafka
const payload = {
  session_id: 'demo-session',
  stop_id: 'stop-1',
  stop_name: '🌱 Cacao Nursery',
  context_hint: 'Baby trees, grafting...'
};

await producer.send({
  topic: 'tour-blueprints',
  messages: [{
    key: 'demo-session', 
    value: JSON.stringify(payload) 
  }]
});`}
              </pre>
            </div>
        </section>

        {/* FEATURE 2: FLINK SQL */}
        <section className="grid md:grid-cols-2 gap-12 items-center">
            <div className="bg-gray-900 rounded-xl overflow-hidden shadow-2xl ring-1 ring-gray-800 order-2 md:order-1">
              <div className="bg-gray-800 px-4 py-2 text-xs text-gray-400 font-mono border-b border-gray-700">enrichment.sql</div>
              <pre className="p-4 text-xs md:text-sm text-blue-400 font-mono overflow-x-auto">
{`SELECT 
  stream.data,
  blueprint.stop_name, 
  blueprint.context_hint
FROM raw_media_stream AS stream
LEFT JOIN tour_blueprints 
  FOR SYSTEM_TIME AS OF stream.event_time 
  AS blueprint 
ON stream.stopId = blueprint.stop_id;`}
              </pre>
            </div>
            <div className="space-y-6 order-1 md:order-2">
               <h2 className="text-3xl font-bold">2. Flink SQL Enrichment</h2>
               <p className="text-lg text-gray-600 leading-relaxed">
                 We use <span className="font-bold text-purple-600">Flink SQL</span> to perform a temporal join.
                 This joins the high-velocity stream of photos with the slowly-changing "Blueprint" table.
               </p>
               <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-sm text-yellow-800">
                 <strong>Why?</strong> This ensures that even if the Guide changes the plan mid-tour, every photo is tagged with the <em>exact context</em> that was active the moment it was taken.
               </div>
            </div>
        </section>

         {/* FEATURE 3: AI PROCESSING */}
         <section className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
               <h2 className="text-3xl font-bold">3. Multi-Modal AI Processing</h2>
               <p className="text-lg text-gray-600 leading-relaxed">
                 Finally, our Node.js worker consumes the enriched stream. It buffers data for 60 seconds (Windowing) and sends a single multi-modal prompt to <span className="font-bold text-blue-600">Gemini 3 Flash</span>.
               </p>
               <p className="text-gray-600">
                 It combines:
                 <br/>📸 <strong>Visuals</strong> (Photos from guests)
                 <br/>🎙️ <strong>Audio</strong> (Commentary from guide)
                 <br/>🗺️ <strong>Context</strong> (From Confluent Blueprint)
               </p>
            </div>
            <div className="bg-gray-900 rounded-xl overflow-hidden shadow-2xl ring-1 ring-gray-800">
              <div className="bg-gray-800 px-4 py-2 text-xs text-gray-400 font-mono border-b border-gray-700">ai_processor.js</div>
              <pre className="p-4 text-xs md:text-sm text-pink-400 font-mono overflow-x-auto">
{`// Multi-Modal Prompt Construction
parts.push({
  text: \
`SECTION: ${stopName}
         CONTEXT: ${contextHint}
         Analyze the audio and photos...\
`
});

if (item.type === 'photo') {
  parts.push({ inlineData: { mimeType: 'image/jpeg', ... } });
}
if (item.type === 'audio') {
  parts.push({ inlineData: { mimeType: 'audio/mp3', ... } });
}`}
              </pre>
            </div>
        </section>

      </main>
      
      {/* FOOTER */}
      <footer className="bg-gray-50 border-t border-gray-200 py-12 text-center text-gray-500 text-sm">
        Built with Confluent Cloud, Flink, and Google Gemini.
      </footer>
    </div>
  );
}
