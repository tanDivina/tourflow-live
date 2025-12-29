'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

// --- TYPEWRITER EFFECT COMPONENT ---
const Typewriter = ({ phrases }) => {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [reverse, setReverse] = useState(false);

  useEffect(() => {
    if (subIndex === phrases[index].length + 1 && !reverse) {
      setTimeout(() => setReverse(true), 2000);
      return;
    }
    if (subIndex === 0 && reverse) {
      setReverse(false);
      setIndex((prev) => (prev + 1) % phrases.length);
      return;
    }

    const timeout = setTimeout(() => {
      setSubIndex((prev) => prev + (reverse ? -1 : 1));
    }, reverse ? 75 : 150);

    return () => clearTimeout(timeout);
  }, [subIndex, index, reverse, phrases]);

  return (
    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-teal-400 to-emerald-500 border-r-2 border-teal-400 pr-1 animate-pulse">
      {phrases[index].substring(0, subIndex)}
    </span>
  );
};

// --- CUSTOM GLOBE CURSOR ---
const GlobeCursor = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updateCursor = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', updateCursor);
    return () => window.removeEventListener('mousemove', updateCursor);
  }, []);

  return (
    <div 
      className="fixed pointer-events-none z-[9999] text-3xl transition-transform duration-75 ease-out select-none"
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      🌍
    </div>
  );
};

// --- SCROLL REVEAL COMPONENT ---
const ScrollReveal = ({ children, delay = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 transform ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

// --- STRIPE-LIKE WAVE BACKGROUND COMPONENT ---
const WaveBackground = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden bg-gray-50">
    <style jsx>{`
      @keyframes gradient {
        0% { transform: translate(0, 0) rotate(0deg); }
        50% { transform: translate(0, -20px) rotate(2deg); }
        100% { transform: translate(0, 0) rotate(0deg); }
      }
      @keyframes wave {
        0% { transform: translateX(-50%) skewY(-12deg); }
        100% { transform: translateX(50%) skewY(-12deg); }
      }
      .stripe-bg {
        position: absolute;
        width: 200%;
        height: 100%;
        background: linear-gradient(120deg, #e0c3fc 0%, #8ec5fc 100%);
        opacity: 0.6;
        animation: wave 25s linear infinite alternate;
        filter: blur(60px);
        top: -50%;
        left: -50%;
      }
      .stripe-bg:nth-child(2) {
        background: linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%);
        animation-duration: 35s;
        top: -40%;
        left: -30%;
        opacity: 0.4;
      }
      .stripe-bg:nth-child(3) {
        background: linear-gradient(120deg, #fccb90 0%, #d57eeb 100%);
        animation-duration: 45s;
        bottom: -20%;
        left: -10%;
        opacity: 0.3;
      }
    `}</style>
    <div className="stripe-bg"></div>
    <div className="stripe-bg"></div>
    <div className="stripe-bg"></div>
    <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px]"></div>
  </div>
);

export default function LandingPage() {
  return (
    <div className="min-h-screen text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900 relative cursor-none">
      <GlobeCursor />
      <WaveBackground />
      
      {/*NAVIGATION */}
      <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
            🌍 TourFlow
          </div>
          <div className="flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-blue-600 transition-colors">How it works</a>
            <Link 
              href="/feed" 
              className="bg-blue-600 text-white px-5 py-2 rounded-full hover:bg-blue-700 transition-all hover:shadow-lg hover:shadow-blue-200"
            >
              Start Live Demo
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          <ScrollReveal>
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                Now powered by Gemini 3 Flash
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-gray-900 leading-[1.1]">
                Turn your tour into a <br />
                <Typewriter phrases={['live story.', 'social feed.', 'vibrant memory.', 'digital guide.']} />
              </h1>
              
              <p className="text-xl text-gray-500 leading-relaxed max-w-lg">
                TourFlow automatically generates engaging, real-time social feeds from your audio commentary and photos using advanced AI.
              </p>

              <div className="flex items-center gap-4 pt-4">
                <Link 
                  href="/feed" 
                  className="bg-gray-900 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-800 transition-all hover:translate-y-[-2px] hover:shadow-xl"
                >
                  Launch App
                </Link>
                <a 
                  href="#demo-video" 
                  className="px-8 py-4 rounded-full font-semibold text-lg text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <span>▶</span> Watch Video
                </a>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={300}>
            <div className="relative">
              {/* Abstract Background Shapes */}
              <div className="absolute -top-20 -right-20 w-96 h-96 bg-purple-100 rounded-full blur-3xl opacity-50 mix-blend-multiply animate-blob"></div>
              <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-50 mix-blend-multiply animate-blob animation-delay-2000"></div>
              
              {/* App Mockup Card */}
              <div className="relative bg-white/40 backdrop-blur-xl border border-white/50 rounded-3xl shadow-2xl overflow-hidden rotate-[-2deg] hover:rotate-0 transition-transform duration-500 ring-1 ring-white/60">
                <div className="bg-white/50 border-b border-white/20 p-4 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400 shadow-sm"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-sm"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400 shadow-sm"></div>
                </div>
                <div className="p-6 space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-xl backdrop-blur-sm">🎤</div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-900/10 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-900/10 rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="aspect-video bg-white/50 rounded-xl flex items-center justify-center text-gray-400 border border-white/40 shadow-inner">
                    AI Generated Live Feed Preview
                  </div>
                  <div className="p-4 bg-blue-600/10 rounded-xl text-blue-900 text-sm border border-blue-100/20">
                    ✨ "Welcome to the Colosseum! This amphitheater could hold up to 80,000 spectators."
                  </div>
                </div>
              </div>

            </div>
          </ScrollReveal>

        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-4xl lg:text-5xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-teal-500 to-emerald-500 inline-block drop-shadow-sm">
                Why use TourFlow?
              </h2>
              <p className="text-lg text-gray-600 font-medium">We handle the content creation so you can focus on the experience.</p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { 
                icon: '🎙️', 
                title: 'Listen & Learn', 
                desc: "Our AI listens to your guide's commentary in real-time to extract facts and context." 
              },
              { 
                icon: '📸', 
                title: 'Smart Curation', 
                desc: 'Automatically selects the best photo from the group to match the current story.' 
              },
              { 
                icon: '✍️', 
                title: 'Instant Captions', 
                desc: 'Generates witty, engaging captions formatted perfectly for social sharing.' 
              },
              { 
                icon: '🚀', 
                title: 'Event Streaming', 
                desc: 'Powered by Confluent Cloud for ultra-low latency, real-time data processing.' 
              }
            ].map((feature, i) => (
              <ScrollReveal key={i} delay={i * 200}>
                <div className="group bg-white/30 backdrop-blur-md p-8 rounded-3xl border border-white/50 shadow-lg hover:shadow-teal-500/20 hover:border-teal-400/50 hover:bg-white/60 transition-all duration-300 hover:-translate-y-2 h-full">
                  <div className="mb-6 inline-block p-4 rounded-2xl bg-gradient-to-br from-white/80 to-white/20 shadow-sm ring-1 ring-white/60 group-hover:scale-110 transition-transform duration-300">
                    <span className="text-4xl">{feature.icon}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-800 group-hover:text-teal-700 transition-colors">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed group-hover:text-gray-800 transition-colors">{feature.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollReveal>
            <div className="text-center max-w-2xl mx-auto mb-20">
              <h2 className="text-4xl lg:text-5xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-teal-500 to-emerald-500 inline-block">
                Simple as 1-2-3
              </h2>
              <p className="text-lg text-gray-600 font-medium">From the tour field to the global feed in seconds.</p>
            </div>
          </ScrollReveal>

          <div className="space-y-32">
            {[
              {
                step: '01',
                title: 'Start Recording',
                desc: 'The guide opens the TourFlow app and starts talking. Our AI begins analyzing the audio stream immediately, identifying landmarks and stories.',
                icon: '🎙️',
                image: '🎤'
              },
              {
                step: '02',
                title: 'Snap & Share',
                desc: 'Guests and guides upload photos of what they see. Our AI automatically matches the most relevant image to the current audio context.',
                icon: '📸',
                image: '🖼️'
              },
              {
                step: '03',
                title: 'Live Story Generated',
                desc: 'Gemini 3 Flash creates a social-media style update with a witty caption and the best photo. Followers see it instantly on the live feed.',
                icon: '✨',
                image: '📱'
              }
            ].map((item, i) => (
              <div key={i} className={`flex flex-col ${i % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-16`}>
                <ScrollReveal delay={100}>
                  <div className="flex-1 space-y-6">
                    <div className="text-6xl font-black text-blue-500/10 mb-2">{item.step}</div>
                    <h3 className="text-3xl font-bold text-gray-800 flex items-center gap-4">
                      <span className="p-3 bg-white/50 rounded-2xl shadow-sm ring-1 ring-white/60">{item.icon}</span>
                      {item.title}
                    </h3>
                    <p className="text-xl text-gray-600 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </ScrollReveal>
                
                <ScrollReveal delay={300}>
                  <div className="flex-1">
                    <div className="relative aspect-video bg-white/30 backdrop-blur-xl rounded-3xl border border-white/50 shadow-2xl flex items-center justify-center text-8xl group hover:scale-105 transition-transform duration-500 ring-1 ring-white/60 overflow-hidden">
                       <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-emerald-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                       {item.image}
                    </div>
                  </div>
                </ScrollReveal>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONFLUENT SECTION */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <ScrollReveal>
            <div className="inline-block p-4 bg-white/30 backdrop-blur-xl rounded-3xl border border-white/50 shadow-xl mb-12 ring-1 ring-white/60">
              <div className="flex items-center gap-4 px-4">
                 <span className="text-2xl">🔗</span>
                 <div className="text-left leading-tight">
                   <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Connected via</div>
                   <div className="text-xl font-black text-gray-800 tracking-tight">CONFLUENT CLOUD</div>
                 </div>
              </div>
            </div>

            <div className="max-w-3xl mx-auto space-y-8">
              <h2 className="text-4xl font-bold text-gray-800">The Real-Time Backbone</h2>
              <p className="text-xl text-gray-600 leading-relaxed">
                TourFlow is built on top of **Confluent Cloud (Apache Kafka)**. We treat every audio clip and photo as a 
                <span className="text-teal-600 font-bold"> real-time event</span>.
              </p>
              
              <div className="grid md:grid-cols-3 gap-6 pt-8">
                <div className="p-6 bg-white/20 rounded-2xl border border-white/30 backdrop-blur-sm">
                   <div className="font-bold text-gray-800 mb-2">Ingestion</div>
                   <div className="text-sm text-gray-500">Raw audio and photos are streamed into Kafka topics.</div>
                </div>
                <div className="p-6 bg-white/20 rounded-2xl border border-white/30 backdrop-blur-sm">
                   <div className="font-bold text-gray-800 mb-2">Processing</div>
                   <div className="text-sm text-gray-500">AI workers consume streams to generate instant captions.</div>
                </div>
                <div className="p-6 bg-white/20 rounded-2xl border border-white/30 backdrop-blur-sm">
                   <div className="font-bold text-gray-800 mb-2">Delivery</div>
                   <div className="text-sm text-gray-500">Processed feed events are pushed to fans globally.</div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white border-t border-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-400 text-sm">
          <p>© {new Date().getFullYear()} TourFlow Live. Built for the future of tourism.</p>
        </div>
      </footer>
    </div>
  );
}
