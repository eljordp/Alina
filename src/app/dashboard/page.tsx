'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Deal, DealStatus } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { RefreshCw, Inbox, Clock, CheckCircle, AlertCircle, Trash2, Search, X } from 'lucide-react';

const STATUS_FILTERS: { label: string; value: string; icon: React.ReactNode }[] = [
  { label: 'All Deals', value: 'all', icon: <Inbox className="w-4 h-4" /> },
  { label: 'New', value: 'new', icon: <AlertCircle className="w-4 h-4" /> },
  { label: 'Processing', value: 'processing', icon: <Clock className="w-4 h-4" /> },
  { label: 'Ready', value: 'ready_for_review', icon: <CheckCircle className="w-4 h-4" /> },
  { label: 'Completed', value: 'completed', icon: <CheckCircle className="w-4 h-4" /> },
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
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filteredDeals.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredDeals.map((d) => d.id)));
    }
  };

  useEffect(() => {
    fetchDeals();
  }, [filter]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchDeals, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const completionRate = (deal: Deal) => {
    const app = deal.application_data;
    if (!app) return 0;
    const fields = Object.entries(app).filter(
      ([k]) => k !== 'missing_fields' && k !== 'confidence_notes'
    );
    const filled = fields.filter(([, v]) => v !== null && v !== undefined && v !== '').length;
    return Math.round((filled / fields.length) * 100);
  };

  // Filter deals by search query
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
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              Alina
            </h1>
            <span className="text-xs text-gray-500 border border-gray-800 rounded-full px-2 py-0.5">
              {filteredDeals.length} deals
            </span>
          </div>
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <button
                onClick={deleteSelected}
                disabled={deleting}
                className="inline-flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? 'Deleting...' : `Delete (${selected.size})`}
              </button>
            )}
            <button
              onClick={pollEmails}
              disabled={polling}
              className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${polling ? 'animate-spin' : ''}`} />
              {polling ? 'Checking...' : 'Check Emails'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Search + filters */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  filter === f.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
                }`}
              >
                {f.icon}
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-8 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-64"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Deals table */}
        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading deals...</div>
        ) : filteredDeals.length === 0 ? (
          <div className="text-center py-20">
            <Inbox className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500">
              {search ? 'No deals match your search.' : 'No deals yet. Emails will appear here automatically.'}
            </p>
            {!search && (
              <button
                onClick={pollEmails}
                className="mt-4 text-blue-400 hover:text-blue-300 text-sm"
              >
                Check inbox now
              </button>
            )}
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selected.size === filteredDeals.length && filteredDeals.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded bg-gray-800 border-gray-700 cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Completion</th>
                  <th className="px-4 py-3">Received</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeals.map((deal) => (
                  <tr
                    key={deal.id}
                    onClick={() => router.push(`/dashboard/${deal.id}`)}
                    className={`border-b border-gray-800/50 hover:bg-gray-800/50 cursor-pointer transition-colors ${
                      selected.has(deal.id) ? 'bg-blue-600/5' : ''
                    }`}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(deal.id)}
                        onChange={() => {}}
                        onClick={(e) => toggleSelect(deal.id, e)}
                        className="rounded bg-gray-800 border-gray-700 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-sm">{deal.client_name}</p>
                        <p className="text-xs text-gray-500">{deal.client_email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400 max-w-xs truncate">
                      {(deal as any).subject_line || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={deal.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${completionRate(deal)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{completionRate(deal)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(deal.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
