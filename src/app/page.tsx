"use client";

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import LandingNavbar from '@/components/LandingNavbar';
import GlassCard from '@/components/GlassCard';

export default function LandingPage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  return (
    <div className="min-h-screen bg-[#050914] text-white selection:bg-purple-500/30 overflow-x-hidden font-sans">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-blue-600/10 blur-[120px] rounded-full" />
      </div>

      <LandingNavbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-purple-300 mb-8 animate-fade-in">
            <span className="flex h-2 w-2 rounded-full bg-purple-500 animate-pulse"></span>

          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 leading-[1.1] font-serif">
            Transform your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-[#38bdf8] to-purple-400 bg-[length:200%_auto] animate-gradient-flow">
              thoughts into clarity
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg md:text-xl text-white/60 mb-10 leading-relaxed">
            Personalized AI that organizes your random notes, voice recordings, and sketches into beautiful, structured documents.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login?mode=signup"
              className="w-full sm:w-auto px-8 py-4 bg-white text-black text-lg font-bold rounded-full hover:bg-neutral-200 transition-all transform hover:scale-105 shadow-2xl shadow-white/10"
            >
              Start Creating for Free
            </Link>
            <Link
              href="#how-it-works"
              className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 text-lg font-bold rounded-full hover:bg-white/10 transition-all"
            >
              Watch Demo
            </Link>
          </div>

          {/* Video Player Section */}
          <div className="mt-20 relative max-w-5xl mx-auto group">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
            <div className="relative bg-[#0d121f] rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden aspect-video flex items-center justify-center">

              {/* Video Element */}
              <video
                ref={videoRef}
                className="w-full h-full object-cover rounded-[2.5rem]"
                poster="/hero-poster-placeholder.jpg"
                onClick={togglePlay}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              >
                <source src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>

              {/* Custom Play Button Overlay */}
              {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px] transition-all duration-300">
                  <button
                    onClick={togglePlay}
                    className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-black cursor-pointer hover:scale-110 transition-transform shadow-[0_0_40px_rgba(255,255,255,0.3)] group-hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] pl-2"
                  >
                    <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 bg-[#080d1a]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 font-serif italic">Crafted for the future of work</h2>
            <p className="text-white/50 text-lg">Every feature is designed to eliminate friction from your creative process.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <GlassCard>
              <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center text-purple-400 mb-6 font-bold text-2xl">
                ⚡
              </div>
              <h3 className="text-xl font-bold mb-3">Instant Structure</h3>
              <p className="text-white/50 leading-relaxed">
                Our AI analyzes your messy notes and transforms them into beautifully formatted documents, checklists, or summaries in seconds.
              </p>
            </GlassCard>

            <GlassCard>
              <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 mb-6 font-bold text-2xl">
                🎙️
              </div>
              <h3 className="text-xl font-bold mb-3">Multi-Modal Inputs</h3>
              <p className="text-white/50 leading-relaxed">
                Whether it's a voice memo, a whiteboard photo, or a quick text snippet, Notesgenai handles it all with ease.
              </p>
            </GlassCard>

            <GlassCard>
              <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 mb-6 font-bold text-2xl">
                🚀
              </div>
              <h3 className="text-xl font-bold mb-3">Smart Automations</h3>
              <p className="text-white/50 leading-relaxed">
                Connect your workspace to any of your favorite tools and let the AI handle the boring administrative tasks for you.
              </p>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg"></div>
            <span className="text-lg font-bold">Notesgenai</span>
          </div>

          <div className="flex gap-8 text-sm text-white/40">
            <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="#" className="hover:text-white transition-colors">Twitter</Link>
          </div>

          <div className="text-sm text-white/20">
            © 2026 Notesgenai. All rights reserved.
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes gradient-flow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient-flow {
          animation: gradient-flow 6s ease infinite;
        }
      `}</style>
    </div>
  );
}
