'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight, Mail, Brain, FileCheck, AlertCircle, FileOutput, Layers, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

function AnimatedNumber({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 1200;
          const start = performance.now();
          const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(target * eased));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{value}{suffix}</span>;
}

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#FDFCFA] overflow-hidden">
      {/* Subtle background accents */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-radial from-amber-100/30 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-gradient-radial from-amber-50/40 via-transparent to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* Nav */}
        <nav className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <span className="text-sm font-semibold text-zinc-800 tracking-tight">Alina</span>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors font-medium"
          >
            Sign In
          </button>
        </nav>

        {/* Hero */}
        <section className="max-w-3xl mx-auto px-6 pt-16 sm:pt-24 pb-16 text-center">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200/60 rounded-full px-3.5 py-1.5 mb-8">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[11px] font-medium text-amber-700 tracking-wide uppercase">AI-Powered Loan Processing</span>
            </div>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-zinc-900 leading-[1.05] animate-fade-in-up delay-100">
            Your 1003, filled
            <br />
            <span className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 bg-clip-text text-transparent">
              before you sit down.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-zinc-500 max-w-xl mx-auto leading-relaxed animate-fade-in-up delay-200">
            Alina watches your inbox, reads every W-2, pay stub, and bank statement,
            then pre-fills the entire URLA. You just review and approve.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-in-up delay-300">
            <button
              onClick={() => router.push('/dashboard')}
              className="group relative inline-flex items-center gap-2.5 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 text-white text-sm px-7 py-3 rounded-lg font-medium hover:shadow-lg hover:shadow-zinc-900/20 transition-all duration-300 animate-shimmer"
              style={{ backgroundSize: '200% 100%' }}
            >
              Open Dashboard
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <span className="text-[11px] text-zinc-400 font-medium tracking-wide">
              No setup required
            </span>
          </div>
        </section>

        {/* How it works - Pipeline */}
        <section className="max-w-4xl mx-auto px-6 py-16">
          <p className="text-center text-[11px] font-semibold text-amber-600/80 uppercase tracking-[0.2em] mb-3 animate-fade-in-up delay-400">
            How It Works
          </p>
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight mb-12 animate-fade-in-up delay-500">
            Email to application in seconds
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-0 relative">
            {/* Connector lines (desktop only) */}
            <div className="hidden sm:block absolute top-12 left-[33%] right-[33%] h-px">
              <div className="absolute inset-0 border-t-2 border-dashed border-amber-200/60" />
            </div>

            {[
              {
                step: '01',
                icon: <Mail className="w-5 h-5" />,
                title: 'Email arrives',
                desc: 'Client sends documents to your inbox. Alina detects it instantly.',
              },
              {
                step: '02',
                icon: <Brain className="w-5 h-5" />,
                title: 'AI parses docs',
                desc: 'Reads W-2s, pay stubs, bank statements. Extracts every field.',
              },
              {
                step: '03',
                icon: <FileCheck className="w-5 h-5" />,
                title: '1003 ready',
                desc: 'Application pre-filled and waiting for your review.',
              },
            ].map((item, i) => (
              <div
                key={item.step}
                className="relative flex flex-col items-center text-center animate-fade-in-up"
                style={{ animationDelay: `${500 + i * 120}ms` }}
              >
                <div className="relative z-10 w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 to-amber-50 border border-amber-200/50 flex items-center justify-center text-amber-700 mb-4 animate-pulse-glow">
                  {item.icon}
                </div>
                <div className="bg-white/70 backdrop-blur-sm border border-zinc-200/60 rounded-xl p-5 w-full hover:shadow-md hover:shadow-amber-100/50 hover:border-amber-200/40 transition-all duration-300">
                  <span className="text-[10px] font-mono text-amber-500/70 tracking-wider">{item.step}</span>
                  <h3 className="text-sm font-semibold text-zinc-900 mt-1.5 mb-1.5">{item.title}</h3>
                  <p className="text-[12px] text-zinc-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Metrics strip */}
        <section className="border-y border-zinc-200/60 bg-white/50 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-6 py-10">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-0 sm:divide-x divide-zinc-200/60">
              {[
                { value: 26, suffix: '', label: 'Fields Auto-Filled' },
                { value: 30, suffix: 's', label: 'Avg Processing' },
                { value: 6, suffix: '', label: 'Document Types' },
                { value: 1003, suffix: '', label: 'URLA Format' },
              ].map((stat, i) => (
                <div key={stat.label} className="text-center sm:px-6 animate-fade-in-up" style={{ animationDelay: `${700 + i * 80}ms` }}>
                  <p className="text-2xl sm:text-3xl font-bold text-zinc-900">
                    {stat.value === 1003 ? (
                      <span>1003</span>
                    ) : stat.label === 'Avg Processing' ? (
                      <span>&lt; <AnimatedNumber target={stat.value} suffix={stat.suffix} /></span>
                    ) : (
                      <AnimatedNumber target={stat.value} suffix={stat.suffix} />
                    )}
                  </p>
                  <p className="text-[11px] text-zinc-400 font-medium mt-1 uppercase tracking-wider">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features grid */}
        <section className="max-w-4xl mx-auto px-6 py-20">
          <p className="text-center text-[11px] font-semibold text-amber-600/80 uppercase tracking-[0.2em] mb-3 animate-fade-in-up">
            Features
          </p>
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight mb-12 animate-fade-in-up delay-100">
            Built for loan officers, by design
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                icon: <Brain className="w-5 h-5" />,
                title: 'AI Document Parsing',
                desc: 'Reads W-2s, pay stubs, bank statements, tax returns, and IDs. Extracts structured data with confidence scores.',
                accent: 'from-amber-500 to-orange-500',
              },
              {
                icon: <Layers className="w-5 h-5" />,
                title: 'Smart Field Mapping',
                desc: 'Automatically maps extracted data to all 26 standard 1003/URLA fields. Handles conflicts between documents.',
                accent: 'from-blue-500 to-indigo-500',
              },
              {
                icon: <AlertCircle className="w-5 h-5" />,
                title: 'Missing Doc Alerts',
                desc: 'Flags gaps in the application and drafts follow-up emails to borrowers requesting missing documentation.',
                accent: 'from-amber-500 to-yellow-500',
              },
              {
                icon: <FileOutput className="w-5 h-5" />,
                title: 'One-Click PDF Export',
                desc: 'Generate a formatted loan application PDF ready for submission. Professional layout, complete with all extracted data.',
                accent: 'from-emerald-500 to-teal-500',
              },
            ].map((feature, i) => (
              <div
                key={feature.title}
                className="group bg-white border border-zinc-200/60 rounded-xl p-6 hover:shadow-lg hover:shadow-zinc-100 hover:border-zinc-300/60 transition-all duration-300 animate-fade-in-up"
                style={{ animationDelay: `${200 + i * 100}ms` }}
              >
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${feature.accent} flex items-center justify-center text-white mb-4 group-hover:scale-105 transition-transform`}>
                  {feature.icon}
                </div>
                <h3 className="text-sm font-semibold text-zinc-900 mb-1.5">{feature.title}</h3>
                <p className="text-[12px] text-zinc-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA footer */}
        <section className="relative">
          <div className="absolute inset-0 bg-gradient-to-t from-amber-50/50 via-transparent to-transparent pointer-events-none" />
          <div className="relative max-w-3xl mx-auto px-6 py-20 text-center">
            <h2 className="text-2xl sm:text-4xl font-bold text-zinc-900 tracking-tight mb-4 animate-fade-in-up">
              Ready to process your first deal?
            </h2>
            <p className="text-zinc-500 text-sm mb-8 animate-fade-in-up delay-100">
              Stop manually filling 1003s. Let Alina handle the data entry.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="group inline-flex items-center gap-2.5 bg-gradient-to-r from-amber-600 to-amber-500 text-white text-sm px-8 py-3.5 rounded-lg font-semibold hover:shadow-lg hover:shadow-amber-500/25 transition-all duration-300 animate-fade-in-up delay-200"
            >
              Open Dashboard
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <p className="mt-4 text-[11px] text-zinc-400 animate-fade-in-up delay-300">
              No credit card required. No setup needed.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-zinc-200/60 bg-white/30">
          <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                <span className="text-white text-[9px] font-bold">A</span>
              </div>
              <span className="text-xs text-zinc-400">Alina &mdash; AI Loan Processing</span>
            </div>
            <span className="text-[11px] text-zinc-300">Built for speed. Designed for loan officers.</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
