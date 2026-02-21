'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0C0C0C] text-white selection:bg-amber-500/20">
      {/* ── Top bar ── */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#0C0C0C]/80 backdrop-blur-md border-b border-white/[0.04]">
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-[15px] font-medium tracking-[-0.01em]">Alina</span>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-[13px] text-white/40 hover:text-white transition-colors duration-200"
          >
            Log in
          </button>
        </div>
      </div>

      {/* ── Hero ── */}
      <div className="max-w-[1200px] mx-auto px-6 pt-32 sm:pt-44 pb-20 sm:pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-16 lg:gap-20 items-start">
          <div>
            <h1 className="text-[clamp(2rem,6vw,3.8rem)] font-semibold leading-[1.1] tracking-[-0.035em] text-white/95">
              Your 1003, filled
              <br className="hidden sm:block" />
              {' '}before you sit down.
            </h1>
            <p className="mt-6 text-[15px] sm:text-[17px] text-white/35 leading-[1.7] max-w-[480px]">
              Alina watches your inbox, reads every W-2, pay stub, and bank
              statement, then pre-fills the entire URLA. You just review.
            </p>
            <div className="mt-10 flex items-center gap-6">
              <button
                onClick={() => router.push('/dashboard')}
                className="group inline-flex items-center gap-2.5 bg-white text-[#0C0C0C] text-[13px] font-semibold px-5 py-2.5 rounded-md hover:bg-white/90 transition-colors"
              >
                Open Dashboard
                <ArrowRight className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          </div>

          {/* Product card */}
          <div className="hidden lg:block pt-4">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-white/[0.04] flex items-center justify-between">
                <span className="text-[11px] text-white/25 uppercase tracking-[0.15em]">Recent Deal</span>
                <span className="text-[10px] text-emerald-400/80 bg-emerald-400/[0.08] px-2 py-0.5 rounded-full">Review</span>
              </div>
              <div className="p-5 space-y-3.5">
                {[
                  ['Borrower', 'James Mitchell'],
                  ['Loan Amount', '$425,000'],
                  ['Property', '1847 Oak Valley Dr'],
                  ['Mid FICO', '742'],
                  ['CLTV', '68%'],
                  ['Rate', '6.875%'],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between items-baseline">
                    <span className="text-[12px] text-white/20">{label}</span>
                    <span className="text-[13px] text-white/70 font-medium tabular-nums">{val}</span>
                  </div>
                ))}
              </div>
              <div className="px-5 pb-5">
                <div className="flex justify-between mb-1.5">
                  <span className="text-[11px] text-white/20">22 of 26 fields</span>
                  <span className="text-[11px] text-white/30 font-mono">85%</span>
                </div>
                <div className="h-[3px] bg-white/[0.04] rounded-full overflow-hidden">
                  <div className="h-full w-[85%] bg-gradient-to-r from-amber-500/70 to-amber-400/50 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Thin rule ── */}
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-white/[0.06] via-white/[0.03] to-transparent" />
      </div>

      {/* ── What it does — editorial layout ── */}
      <div className="max-w-[1200px] mx-auto px-6 py-20 sm:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-12 lg:gap-20">
          <div>
            <p className="text-[12px] text-white/20 uppercase tracking-[0.15em] mb-4">Process</p>
            <p className="text-[15px] text-white/35 leading-[1.7]">
              Every deal that hits your inbox gets parsed, structured, and mapped
              to the 1003 — automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/[0.04] rounded-lg overflow-hidden">
            {[
              {
                title: 'Email arrives',
                desc: 'Client sends documents to your inbox. Alina detects the loan request and creates a deal.',
              },
              {
                title: 'Documents parsed',
                desc: 'AI reads every W-2, pay stub, bank statement, and tax return. Extracts fields with confidence scores.',
              },
              {
                title: 'Application ready',
                desc: 'All 26 URLA fields pre-filled. Missing items flagged. You review, approve, and export.',
              },
            ].map((step) => (
              <div key={step.title} className="bg-[#0C0C0C] p-6 sm:p-7">
                <h3 className="text-[14px] font-medium text-white/80 mb-2">{step.title}</h3>
                <p className="text-[12px] text-white/25 leading-[1.7]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Capabilities — simple list ── */}
      <div className="max-w-[1200px] mx-auto px-6 pb-20 sm:pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-12 lg:gap-20">
          <div>
            <p className="text-[12px] text-white/20 uppercase tracking-[0.15em]">Capabilities</p>
          </div>

          <div>
            {[
              {
                title: 'Document parsing',
                desc: 'W-2s, pay stubs, bank statements, tax returns, government IDs. Structured extraction.',
              },
              {
                title: '1003 field mapping',
                desc: '26 standard URLA fields auto-populated. Conflicts between documents handled automatically.',
              },
              {
                title: 'Gap detection',
                desc: 'Missing fields flagged instantly. Follow-up emails drafted and ready to send.',
              },
              {
                title: 'PDF export',
                desc: 'One-click export of the completed loan application. Professional format for submission.',
              },
              {
                title: 'Deal pipeline',
                desc: 'Track every application from intake to completion. Filter, sort, and organize by status.',
              },
              {
                title: 'Activity log',
                desc: 'Full audit trail. Every email, parse, edit, and status change recorded with timestamps.',
              },
            ].map((item, i) => (
              <div
                key={item.title}
                className={`flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-8 py-5 ${
                  i > 0 ? 'border-t border-white/[0.04]' : ''
                }`}
              >
                <h3 className="text-[14px] font-medium text-white/70 sm:w-48 shrink-0">{item.title}</h3>
                <p className="text-[13px] text-white/25 leading-[1.6]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Numbers — inline, understated ── */}
      <div className="max-w-[1200px] mx-auto px-6 pb-20 sm:pb-28">
        <div className="h-px bg-white/[0.04] mb-12" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-8 gap-x-6">
          {[
            ['26', 'fields per deal'],
            ['<30s', 'processing time'],
            ['6', 'doc types'],
            ['1003', 'URLA format'],
          ].map(([val, label]) => (
            <div key={label}>
              <p className="text-2xl sm:text-[2rem] font-semibold text-white/90 tracking-tight tabular-nums">{val}</p>
              <p className="text-[11px] text-white/15 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom CTA ── */}
      <div className="max-w-[1200px] mx-auto px-6 pb-16">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-8 sm:px-12 py-12 sm:py-14 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-white/90 tracking-tight">
              Ready to process your first deal?
            </h2>
            <p className="mt-1.5 text-[14px] text-white/25">
              Stop filling 1003s by hand.
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="group shrink-0 inline-flex items-center gap-2 bg-white text-[#0C0C0C] text-[13px] font-semibold px-5 py-2.5 rounded-md hover:bg-white/90 transition-colors"
          >
            Get started
            <ArrowRight className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="max-w-[1200px] mx-auto px-6 py-6 flex items-center justify-between border-t border-white/[0.04]">
        <span className="text-[12px] text-white/15">Alina</span>
        <span className="text-[11px] text-white/10">Loan processing infrastructure</span>
      </div>
    </div>
  );
}
