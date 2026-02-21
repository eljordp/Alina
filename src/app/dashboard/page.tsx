'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Deal } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { RefreshCw, Inbox, Clock, CheckCircle, AlertCircle, Trash2, Search, X } from 'lucide-react';

const STATUS_FILTERS = [
  { label: 'All', value: 'all', icon: <Inbox className="w-3.5 h-3.5" /> },
  { label: 'New', value: 'new', icon: <AlertCircle className="w-3.5 h-3.5" /> },
  { label: 'Processing', value: 'processing', icon: <Clock className="w-3.5 h-3.5" /> },
  { label: 'Ready', value: 'ready_for_review', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  { label: 'Done', value: 'completed', icon: <CheckCircle className="w-3.5 h-3.5" /> },
];

export default function DashboardPage() {
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [polling, setPolling] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(false);

  const fetchDeals = async () => {
    try {
      const res = await fetch(`/api/deals?status=${filter}`);
      const data = await res.json();
      setDeals(data);
    } catch (err) {
      console.error('Failed to fetch deals:', err);
    } finally {
      setLoading(false);
    }
  };

  const pollEmails = async () => {
    setPolling(true);
    try {
      await fetch('/api/webhooks/gmail');
      await fetchDeals();
    } catch (err) {
      console.error('Poll failed:', err);
    } finally {
      setPolling(false);
    }
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    setDeleting(true);
    try {
      await fetch('/api/deals', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      setSelected(new Set());
      await fetchDeals();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleting(false);
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filteredDeals.length) setSelected(new Set());
    else setSelected(new Set(filteredDeals.map((d) => d.id)));
  };

  useEffect(() => { fetchDeals(); }, [filter]);
  useEffect(() => {
    const interval = setInterval(fetchDeals, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const completionRate = (deal: Deal) => {
    const app = deal.application_data;
    if (!app) return 0;
    const fields = Object.entries(app).filter(([k]) => k !== 'missing_fields' && k !== 'confidence_notes');
    const filled = fields.filter(([, v]) => v !== null && v !== undefined && v !== '').length;
    return Math.round((filled / fields.length) * 100);
  };

  const filteredDeals = deals.filter((deal) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      deal.client_name?.toLowerCase().includes(q) ||
      deal.client_email?.toLowerCase().includes(q) ||
      (deal as any).subject_line?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800/60 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-white tracking-tight">Alina</h1>
            <span className="text-[11px] text-zinc-500 bg-zinc-900 rounded-md px-2 py-0.5 font-mono">
              {filteredDeals.length} {filteredDeals.length === 1 ? 'deal' : 'deals'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <button
                onClick={deleteSelected}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/15 text-xs px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deleting ? 'Deleting...' : `Delete ${selected.size}`}
              </button>
            )}
            <button
              onClick={pollEmails}
              disabled={polling}
              className="inline-flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${polling ? 'animate-spin' : ''}`} />
              {polling ? 'Checking...' : 'Check Emails'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-5">
        {/* Toolbar: filters + search */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1 bg-zinc-900 rounded-lg p-0.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  filter === f.value
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {f.icon}
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-md pl-8 pr-7 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 w-52"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-20 text-zinc-600 text-sm">Loading...</div>
        ) : filteredDeals.length === 0 ? (
          <div className="text-center py-24">
            <Inbox className="w-10 h-10 text-zinc-800 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">
              {search ? 'No deals match your search.' : 'No deals yet.'}
            </p>
            {!search && (
              <button onClick={pollEmails} className="mt-3 text-blue-400 hover:text-blue-300 text-xs">
                Check inbox now
              </button>
            )}
          </div>
        ) : (
          <div className="border border-zinc-800/60 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-zinc-900/50 text-left text-[11px] text-zinc-500 uppercase tracking-wider">
                  <th className="pl-4 pr-2 py-2.5 w-10">
                    <input
                      type="checkbox"
                      checked={selected.size === filteredDeals.length && filteredDeals.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-3 py-2.5">Client</th>
                  <th className="px-3 py-2.5">Subject</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Progress</th>
                  <th className="px-3 py-2.5">Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {filteredDeals.map((deal) => {
                  const rate = completionRate(deal);
                  return (
                    <tr
                      key={deal.id}
                      onClick={() => router.push(`/dashboard/${deal.id}`)}
                      className={`hover:bg-zinc-900/60 cursor-pointer transition-colors ${
                        selected.has(deal.id) ? 'bg-zinc-900/40' : ''
                      }`}
                    >
                      <td className="pl-4 pr-2 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(deal.id)}
                          onChange={() => {}}
                          onClick={(e) => toggleSelect(deal.id, e)}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-sm font-medium text-zinc-200">{deal.client_name}</p>
                        <p className="text-[11px] text-zinc-600">{deal.client_email}</p>
                      </td>
                      <td className="px-3 py-3 text-xs text-zinc-500 max-w-[200px] truncate">
                        {(deal as any).subject_line || '—'}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={deal.status} />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                rate >= 80 ? 'bg-emerald-500' : rate >= 40 ? 'bg-blue-500' : 'bg-zinc-600'
                              }`}
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-zinc-500 font-mono w-7">{rate}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[11px] text-zinc-600">
                        {new Date(deal.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
