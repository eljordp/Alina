'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight, Mail, FileText, Zap } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="max-w-2xl text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              Alina
            </span>
          </h1>
          <p className="text-xl text-gray-400">
            AI-powered loan processing. Emails come in, applications come out.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 text-left">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
            <Mail className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-sm">Email Intake</h3>
            <p className="text-xs text-gray-500">Clients email docs. Alina watches the inbox 24/7.</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
            <FileText className="w-5 h-5 text-violet-400" />
            <h3 className="font-semibold text-sm">AI Extraction</h3>
            <p className="text-xs text-gray-500">Parses W-2s, pay stubs, bank statements automatically.</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-sm">Ready to Submit</h3>
            <p className="text-xs text-gray-500">Pre-filled applications waiting for your review.</p>
          </div>
        </div>

        <button
          onClick={() => router.push('/dashboard')}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-medium transition-colors"
        >
          Open Dashboard
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
