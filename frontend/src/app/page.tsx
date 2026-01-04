'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import Link from 'next/link';

export default function LandingPage() {
    const containerRef = useRef<HTMLDivElement>(null);

    // Parallax scroll tracking
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end start"]
    });

    // Parallax transforms (background moves slower than foreground)
    const y1 = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);
    const y2 = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
    const y3 = useTransform(scrollYProgress, [0, 1], ['0%', '15%']);
    const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
    const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

    const scrollToCards = () => {
        const section = document.getElementById('role-cards');
        section?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <main ref={containerRef} className="bg-[var(--brutalist-yellow)] min-h-screen relative overflow-x-hidden selection:bg-black selection:text-[var(--brutalist-yellow)] relative">

            {/* GRID & NOISE */}
            <div className="bg-noise z-50 pointer-events-none fixed inset-0 opacity-10" />
            <div className="grid-pattern fixed inset-0 opacity-30 pointer-events-none" />

            {/* MARQUEE (Sticky Top) */}
            <div className="bg-black py-2 border-b-4 border-black fixed top-0 w-full z-50">
                <div className="marquee-content whitespace-nowrap">
                    <span className="text-[var(--brutalist-yellow)] font-mono font-bold text-sm md:text-base mx-4 uppercase tracking-[0.2em]">
                        BLOCKCHAIN VERIFIED ★ GOODWILL TOKENS ★ CIRCULAR ECONOMY ★ ZERO WASTE ★ BLOCKCHAIN VERIFIED ★ GOODWILL TOKENS ★
                    </span>
                    <span className="text-[var(--brutalist-yellow)] font-mono font-bold text-sm md:text-base mx-4 uppercase tracking-[0.2em]">
                        BLOCKCHAIN VERIFIED ★ GOODWILL TOKENS ★ CIRCULAR ECONOMY ★ ZERO WASTE ★ BLOCKCHAIN VERIFIED ★ GOODWILL TOKENS ★
                    </span>
                </div>
            </div>

            {/* HERO SECTION (ABSOLUTE LAYOUT) */}
            <section className="h-screen w-full relative overflow-hidden pt-20">

                {/* 1. RED DIAMOND (Top Right) */}
                <motion.div
                    initial={{ scale: 0, rotate: 0 }}
                    animate={{ scale: 1, rotate: 45 }}
                    className="absolute top-[15%] right-[10%] w-24 h-24 md:w-48 md:h-48 bg-[var(--brutalist-red)] border-4 border-black shadow-[12px_12px_0px_0px_black] z-10"
                />

                {/* 2. MAIN TEXT (SIDE BY SIDE) */}
                <motion.div style={{ y: y2 }} className="absolute inset-0 pointer-events-none z-0">
                    <div className="absolute top-[25%] left-[5%] flex flex-wrap items-end gap-4 md:gap-12">
                        {/* TOOL */}
                        <h1 className="text-[8rem] md:text-[14rem] leading-none font-black uppercase text-black">
                            TOOL
                        </h1>

                        {/* INC. (Red, Side by Side) */}
                        <h1 className="text-[8rem] md:text-[14rem] leading-none font-black uppercase text-[var(--brutalist-red)]">
                            INC.
                        </h1>
                    </div>
                </motion.div>

                {/* 3. SUBTITLE BAR (Below Text) */}
                <div className="absolute top-[55%] left-[5%] z-20 flex items-center">
                    {/* Black Square Anchor */}
                    <div className="w-12 h-12 md:w-20 md:h-20 bg-black border-4 border-black hidden md:block" />

                    {/* Text Bar */}
                    <div className="bg-black text-[var(--brutalist-yellow)] p-4 md:p-5 border-4 border-black">
                        <p className="font-mono font-bold text-lg md:text-2xl uppercase tracking-widest whitespace-nowrap">
                            ZERO-WASTE SUPPLY CHAIN • AI POWERED
                        </p>
                    </div>
                </div>

                {/* 4. BUTTONS (Bottom Left) */}
                <div className="absolute bottom-[10%] left-[5%] z-30 flex flex-col md:flex-row gap-6">
                    <Link href="/auth">
                        <motion.button
                            whileHover={{ translate: "4px 4px", boxShadow: "0px 0px 0px black" }}
                            className="bg-[var(--brutalist-red)] text-white text-xl md:text-3xl font-black uppercase px-8 py-5 border-4 border-black shadow-[8px_8px_0px_0px_black] transition-all"
                        >
                            GET STARTED
                        </motion.button>
                    </Link>
                </div>

                {/* 5. ARROW BUTTON (Simplified & Classy) */}
                <motion.div
                    animate={{ y: [0, 10, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    onClick={scrollToCards}
                    className="absolute bottom-10 right-10 cursor-pointer z-30 hover:opacity-70 transition-opacity"
                >
                    <span className="text-black text-7xl md:text-8xl font-thin leading-none">↓</span>
                </motion.div>
            </section>

            {/* 3. CARDS SECTION (Clean White) */}
            <section id="role-cards" className="min-h-screen py-32 px-6 md:px-16 bg-white border-t-8 border-black relative z-40">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-7xl md:text-9xl font-black mb-24 text-black uppercase tracking-tighter">
                        CHOOSE<br />YOUR ROLE
                    </h2>

                    <div className="grid md:grid-cols-3 gap-12">
                        {/* Manufacturer */}
                        <Card
                            title="FACTORY"
                            icon="🏭"
                            role="MINT & TRACK"
                            benefit="Generate immutable blockchain batches for full transparency."
                            href="/auth?role=manufacturer"
                            bg="bg-[var(--brutalist-cream)]"
                        />
                        {/* Retailer */}
                        <Card
                            title="RETAIL"
                            icon="🛒"
                            role="SELL & DONATE"
                            benefit="Automate inventory and claim tax credits for donations."
                            href="/auth?role=retailer"
                            bg="bg-[var(--brutalist-yellow)]"
                        />
                        {/* NGO */}
                        <Card
                            title="NGO"
                            icon="🤝"
                            role="SUPPORT YOUR ORG"
                            benefit="Receive verified food aid and earn Goodwill Tokens."
                            href="/auth?role=ngo"
                            bg="bg-[var(--brutalist-red)]"
                            text="text-white"
                        />
                    </div>
                </div>
            </section>

            {/* 4. WORKFLOW SECTION (Dark Mode - Terminal Style) */}
            <section className="py-32 px-6 md:px-16 bg-black text-[var(--brutalist-yellow)] border-t-8 border-[var(--brutalist-yellow)]">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-7xl md:text-9xl font-black mb-24 uppercase tracking-tighter text-white">
                        HOW IT<br /><span className="text-[var(--brutalist-yellow)]">WORKS</span>
                    </h2>

                    <div className="grid md:grid-cols-4 gap-8">
                        {/* Step 1 */}
                        <TerminalCard
                            step="01"
                            title="MINT"
                            desc="Manufacturer creates a distinct digital twin of the product batch on-chain."
                        />
                        {/* Step 2 */}
                        <TerminalCard
                            step="02"
                            title="TRACK"
                            desc="Supply chain movements are recorded. Retailers receive stock securely."
                        />
                        {/* Step 3 */}
                        <TerminalCard
                            step="03"
                            title="DONATE"
                            desc="At end-of-life, unsold goods are flagged and offered to nearby NGOs."
                        />
                        {/* Step 4 */}
                        <TerminalCard
                            step="04"
                            title="EARN"
                            desc="NGO verifies receipt. Smart contracts release Goodwill Tokens automatically."
                        />
                    </div>
                </div>
            </section>

            {/* 5. FOOTER */}
            <footer className="bg-[var(--brutalist-yellow)] text-black border-t-8 border-black py-16 px-6 md:px-16">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end">
                    <div>
                        <h1 className="text-6xl md:text-8xl font-black uppercase mb-4 leading-none">TOOL INC.</h1>
                        <p className="font-mono font-bold text-xl uppercase">Zero Waste • 100% Impact</p>
                    </div>
                    <div className="flex gap-8 mt-8 md:mt-0 font-mono font-bold text-lg uppercase">
                        <a href="#" className="hover:underline">Github</a>
                        <a href="#" className="hover:underline">Documentation</a>
                        <a href="#" className="hover:underline">Contact</a>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto mt-16 pt-8 border-t-4 border-black font-mono text-sm opacity-60">
                    © 2026 TOOL INC. ALL RIGHTS RESERVED. BLOCKCHAIN VERIFIED.
                </div>
            </footer>
        </main>
    );
}

function Card({ title, icon, role, benefit, href, bg, text = "text-black" }: any) {
    return (
        <Link href={href}>
            <motion.div
                whileHover={{ y: -10, boxShadow: "16px 16px 0px black" }}
                className={`h-full border-4 border-black ${bg} p-10 flex flex-col justify-between shadow-[8px_8px_0px_0px_black] transition-all cursor-pointer aspect-[4/5]`}
            >
                <div>
                    <div className="text-8xl mb-6">{icon}</div>
                    <h3 className={`text-5xl font-black uppercase ${text}`}>{title}</h3>
                </div>
                <div className={`border-t-4 ${text === 'text-white' ? 'border-white' : 'border-black'} pt-6 mt-6`}>
                    <p className={`font-black text-2xl uppercase mb-2 ${text}`}>{role}</p>
                    <p className={`font-mono font-bold text-sm uppercase leading-relaxed opacity-90 ${text}`}>
                        {benefit}
                    </p>
                </div>
            </motion.div>
        </Link>
    );
}

function TerminalCard({ step, title, desc }: any) {
    return (
        <div className="bg-[#111] border-2 border-[var(--brutalist-yellow)] p-8 font-mono relative group hover:bg-[#222] transition-colors h-full">
            <div className="absolute top-4 right-4 text-[var(--brutalist-yellow)] text-xl opacity-50 font-bold">
                {step}
            </div>
            <div className="text-green-500 mb-6 text-4xl">
                {'>_'}
            </div>
            <h3 className="text-3xl font-bold text-white mb-4 uppercase">{title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
                {desc}
            </p>
            <div className="mt-6 w-full h-1 bg-gray-800">
                <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: "100%" }}
                    transition={{ duration: 1.5, delay: 0.2 }}
                    className="h-full bg-green-500"
                />
            </div>
        </div>
    );
}
