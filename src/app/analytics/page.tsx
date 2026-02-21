'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Deal } from '@/lib/types';
import { Home, ArrowLeft, TrendingUp, Users, Clock, CheckCircle, AlertCircle, FileText } from 'lucide-react';

interface Stats {
  total: number;
  byStatus: Record<string, number>;
  avgCompletion: number;
  fullyComplete: number;
  avgFieldsFilled: number;
  totalFields: number;
  recentDeals: Deal[];
  topMissingFields: [string, number][];
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/deals?status=all')
      .then((r) => r.json())
      .then((data) => { setDeals(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const computeStats = (): Stats => {
    const byStatus: Record<string, number> = { new: 0, processing: 0, ready_for_review: 0, completed: 0 };
    const missingCount: Record<string, number> = {};
    let totalCompletion = 0;
    let fullyComplete = 0;
    let totalFieldsFilled = 0;
    const fieldKeys = [
      'loan_amount', 'property_value', 'interest_rate', 'protective_equity', 'term_months', 'cltv',
      'property_address', 'property_sqft', 'property_type', 'bedrooms', 'bathrooms', 'lot_size', 'year_built',
      'first_td_balance', 'first_td_monthly_payment', 'first_td_interest_rate', 'monthly_hoa_fees',
      'borrower_name', 'borrower_ssn', 'borrower_dob', 'borrower_phone',
      'employment', 'employment_income', 'liquid_assets', 'rental_income', 'mid_fico',
    ];

    for (const deal of deals) {
      byStatus[deal.status] = (byStatus[deal.status] || 0) + 1;
      const app = deal.application_data;
      if (app) {
        const filled = fieldKeys.filter((k) => {
          const v = (app as any)[k];
          return v !== null && v !== undefined && v !== '';
        }).length;
        const rate = Math.round((filled / fieldKeys.length) * 100);
        totalCompletion += rate;
        totalFieldsFilled += filled;
        if (rate >= 90) fullyComplete++;

        const missing = app.missing_fields || [];
        for (const f of missing) {
          missingCount[f] = (missingCount[f] || 0) + 1;
        }
      }
    }

    const topMissing = Object.entries(missingCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8) as [string, number][];

    return {
      total: deals.length,
      byStatus,
      avgCompletion: deals.length ? Math.round(totalCompletion / deals.length) : 0,
      fullyComplete,
      avgFieldsFilled: deals.length ? Math.round(totalFieldsFilled / deals.length) : 0,
      totalFields: fieldKeys.length,
      recentDeals: [...deals].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5),
      topMissingFields: topMissing,
    };
  };

  const stats = computeStats();

  const StatusBar = ({ label, count, total, color }: { label: string; count: number; total: number; color: string }) => (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-zinc-600">{label}</span>
        <span className="font-mono text-zinc-900">{count}</span>
      </div>
      <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all animate-grow-width ${color}`}
          style={{ width: total > 0 ? `${(count / total) * 100}%` : '0%' }}
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-200 px-4 sm:px-6 py-4 animate-slide-down">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <button onClick={() => router.push('/dashboard')} className="text-zinc-400 hover:text-zinc-700 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-base sm:text-lg font-semibold text-zinc-900 tracking-tight">Analytics</h1>
          </div>
          <button onClick={() => router.push('/')} className="text-zinc-400 hover:text-zinc-700 transition-colors">
            <Home className="w-4 h-4" />
          </button>
        </div>
      </header>

      {loading ? (
        <div className="text-center py-20 text-zinc-400 text-sm animate-fade-in">Loading...</div>
      ) : (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {[
              { label: 'Total Deals', value: stats.total, icon: <Users className="w-4 h-4" />, color: 'text-zinc-900' },
              { label: 'Avg Completion', value: `${stats.avgCompletion}%`, icon: <TrendingUp className="w-4 h-4" />, color: stats.avgCompletion >= 70 ? 'text-emerald-600' : 'text-blue-600' },
              { label: 'Ready for Review', value: stats.byStatus.ready_for_review || 0, icon: <CheckCircle className="w-4 h-4" />, color: 'text-emerald-600' },
              { label: 'Needs Attention', value: stats.byStatus.new || 0, icon: <AlertCircle className="w-4 h-4" />, color: 'text-amber-600' },
            ].map((card, i) => (
              <div
                key={card.label}
                className="border border-zinc-200 rounded-lg p-4 animate-fade-in-up hover:shadow-sm transition-shadow"
                style={{ animationDelay: `${100 + i * 60}ms` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-zinc-500 uppercase tracking-wider">{card.label}</span>
                  <span className="text-zinc-400">{card.icon}</span>
                </div>
                <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Pipeline breakdown */}
            <div className="border border-zinc-200 rounded-lg p-5 animate-fade-in-up delay-300">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Pipeline</h2>
              <div className="space-y-4">
                <StatusBar label="New" count={stats.byStatus.new || 0} total={stats.total} color="bg-blue-400" />
                <StatusBar label="Processing" count={stats.byStatus.processing || 0} total={stats.total} color="bg-amber-400" />
                <StatusBar label="Ready for Review" count={stats.byStatus.ready_for_review || 0} total={stats.total} color="bg-emerald-400" />
                <StatusBar label="Completed" count={stats.byStatus.completed || 0} total={stats.total} color="bg-zinc-400" />
              </div>
            </div>

            {/* Most missing fields */}
            <div className="border border-zinc-200 rounded-lg p-5 animate-fade-in-up delay-400">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Most Missing Fields</h2>
              {stats.topMissingFields.length === 0 ? (
                <p className="text-sm text-zinc-400">No missing fields data</p>
              ) : (
                <div className="space-y-2.5">
                  {stats.topMissingFields.map(([field, count]) => (
                    <div key={field} className="flex items-center justify-between">
                      <span className="text-xs text-zinc-700">{field.replace(/_/g, ' ')}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full"
                            style={{ width: `${(count / stats.total) * 100}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-zinc-500 font-mono w-6 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent deals */}
          <div className="border border-zinc-200 rounded-lg p-5 animate-fade-in-up delay-500">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Recent Deals</h2>
            {stats.recentDeals.length === 0 ? (
              <p className="text-sm text-zinc-400">No deals yet</p>
            ) : (
              <div className="space-y-2">
                {stats.recentDeals.map((deal) => {
                  const app = deal.application_data;
                  const fieldKeys = [
                    'loan_amount', 'property_value', 'interest_rate', 'protective_equity', 'term_months', 'cltv',
                    'property_address', 'property_sqft', 'property_type', 'bedrooms', 'bathrooms', 'lot_size', 'year_built',
                    'first_td_balance', 'first_td_monthly_payment', 'first_td_interest_rate', 'monthly_hoa_fees',
                    'borrower_name', 'borrower_ssn', 'borrower_dob', 'borrower_phone',
                    'employment', 'employment_income', 'liquid_assets', 'rental_income', 'mid_fico',
                  ];
                  const filled = app ? fieldKeys.filter((k) => { const v = (app as any)[k]; return v !== null && v !== undefined && v !== ''; }).length : 0;
                  const rate = Math.round((filled / fieldKeys.length) * 100);

                  return (
                    <div
                      key={deal.id}
                      onClick={() => router.push(`/dashboard/${deal.id}`)}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-50 cursor-pointer transition-colors gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-4 h-4 text-zinc-400 shrink-0 hidden sm:block" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-900 truncate">{deal.client_name}</p>
                          <p className="text-[11px] text-zinc-400 truncate">{deal.client_email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                        <div className="flex items-center gap-2">
                          <div className="w-12 sm:w-16 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${rate >= 80 ? 'bg-emerald-500' : rate >= 40 ? 'bg-blue-500' : 'bg-zinc-400'}`}
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-zinc-500 font-mono">{rate}%</span>
                        </div>
                        <span className="text-[11px] text-zinc-400 hidden sm:inline">
                          {new Date(deal.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
