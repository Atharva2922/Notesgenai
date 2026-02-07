"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const LandingNavbar = () => {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-transparent ${isScrolled ? 'bg-[#050914]/80 backdrop-blur-lg border-white/5 py-3' : 'bg-transparent py-6'
                }`}
        >
            <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#c084fc] to-[#38bdf8] rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform">
                        N
                    </div>
                    <span className="text-xl font-bold tracking-tight text-white">Notesgen<span className="text-[#38bdf8]">ai</span></span>
                </Link>

                <div className="hidden md:flex items-center gap-8">
                    <Link href="#features" className="text-sm font-medium text-white/60 hover:text-white transition-colors">Features</Link>
                    <Link href="#how-it-works" className="text-sm font-medium text-white/60 hover:text-white transition-colors">How it Works</Link>
                    <Link href="#pricing" className="text-sm font-medium text-white/60 hover:text-white transition-colors">Pricing</Link>
                </div>

                <div className="flex items-center gap-4">
                    <Link
                        href="/login"
                        className="text-sm font-medium text-white/80 hover:text-white transition-colors hidden sm:block"
                    >
                        Sign in
                    </Link>
                    <Link
                        href="/login?mode=signup"
                        className="px-5 py-2.5 bg-white text-black text-sm font-bold rounded-full hover:bg-neutral-200 transition-colors shadow-xl shadow-white/5"
                    >
                        Get Started
                    </Link>
                </div>
            </div>
        </nav>
    );
};

export default LandingNavbar;
