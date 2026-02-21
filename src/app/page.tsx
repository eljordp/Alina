'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight, Mail, FileText, Zap } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="max-w-lg text-center space-y-10">
        <div className="space-y-3 animate-fade-in-up">
          <h1 className="text-5xl font-bold tracking-tight text-zinc-900">Alina</h1>
          <p className="text-zinc-500 text-sm">
            AI loan processing. Emails in, applications out.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-left">
          <div className="border border-zinc-200 rounded-lg p-3.5 space-y-2 animate-fade-in-up delay-100 hover:border-zinc-300 hover:shadow-sm transition-all cursor-default">
            <Mail className="w-4 h-4 text-zinc-600" />
            <p className="text-[11px] text-zinc-500 leading-relaxed">Watches inbox. Grabs docs automatically.</p>
          </div>
          <div className="border border-zinc-200 rounded-lg p-3.5 space-y-2 animate-fade-in-up delay-200 hover:border-zinc-300 hover:shadow-sm transition-all cursor-default">
            <FileText className="w-4 h-4 text-zinc-600" />
            <p className="text-[11px] text-zinc-500 leading-relaxed">AI reads W-2s, pay stubs, statements.</p>
          </div>
          <div className="border border-zinc-200 rounded-lg p-3.5 space-y-2 animate-fade-in-up delay-300 hover:border-zinc-300 hover:shadow-sm transition-all cursor-default">
            <Zap className="w-4 h-4 text-zinc-600" />
            <p className="text-[11px] text-zinc-500 leading-relaxed">Pre-fills applications. Ready to review.</p>
          </div>
        </div>

        <button
          onClick={() => router.push('/dashboard')}
          className="inline-flex items-center gap-2 bg-zinc-900 text-white text-sm px-5 py-2 rounded-md font-medium hover:bg-zinc-800 hover:gap-3 transition-all animate-fade-in-up delay-400"
        >
          Open Dashboard
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
