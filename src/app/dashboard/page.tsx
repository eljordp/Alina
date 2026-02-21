'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Deal } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { RefreshCw, Inbox, Clock, CheckCircle, AlertCircle, Trash2, Search, X, Home, ArrowUpDown, ChevronUp, ChevronDown, BarChart3 } from 'lucide-react';

const STATUS_FILTERS = [
  { label: 'All', value: 'all', icon: <Inbox className="w-3.5 h-3.5" /> },
  { label: 'New', value: 'new', icon: <AlertCircle className="w-3.5 h-3.5" /> },
  { label: 'Processing', value: 'processing', icon: <Clock className="w-3.5 h-3.5" /> },
  { label: 'Ready', value: 'ready_for_review', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  { label: 'Done', value: 'completed', icon: <CheckCircle className="w-3.5 h-3.5" /> },
];

type SortField = 'client' | 'status' | 'progress' | 'date';
type SortDir = 'asc' | 'desc';

const STATUS_ORDER = { new: 0, processing: 1, ready_for_review: 2, completed: 3 };

export default function DashboardPage() {
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [polling, setPolling] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

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

  const updateDealStatus = async (dealId: string, status: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      await fetchDeals();
    } catch (err) {
      console.error('Failed to update status:', err);
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
    if (selected.size === sortedDeals.length) setSelected(new Set());
    else setSelected(new Set(sortedDeals.map((d) => d.id)));
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'date' ? 'desc' : 'asc');
    }
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

  const completionLabel = (rate: number) => {
    if (rate >= 90) return 'Complete';
    if (rate >= 50) return 'Partial';
    if (rate > 0) return 'Minimal';
    return 'Empty';
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

  const sortedDeals = [...filteredDeals].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    switch (sortField) {
      case 'client':
        return dir * (a.client_name || '').localeCompare(b.client_name || '');
      case 'status':
        return dir * ((STATUS_ORDER[a.status] || 0) - (STATUS_ORDER[b.status] || 0));
      case 'progress':
        return dir * (completionRate(a) - completionRate(b));
      case 'date':
        return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      default:
        return 0;
    }
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-zinc-300" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-zinc-700" />
      : <ChevronDown className="w-3 h-3 text-zinc-700" />;
  };

  // Status counts for filter badges
  const statusCounts = deals.reduce((acc, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-zinc-200 px-6 py-4 animate-slide-down">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              <Home className="w-4 h-4" />
            </button>
            <h1 className="text-lg font-semibold text-zinc-900 tracking-tight">Alina</h1>
            <span className="text-[11px] text-zinc-500 bg-zinc-100 rounded-md px-2 py-0.5 font-mono">
              {sortedDeals.length} {sortedDeals.length === 1 ? 'deal' : 'deals'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <button
                onClick={deleteSelected}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 text-xs px-3 py-1.5 rounded-md transition-all animate-scale-in disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deleting ? 'Deleting...' : `Delete ${selected.size}`}
              </button>
            )}
            <button
              onClick={() => router.push('/analytics')}
              className="inline-flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs px-3 py-1.5 rounded-md transition-colors"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Analytics
            </button>
            <button
              onClick={pollEmails}
              disabled={polling}
              className="inline-flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${polling ? 'animate-spin' : ''}`} />
              {polling ? 'Checking...' : 'Check Emails'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-5">
        {/* Toolbar: filters + search */}
        <div className="flex items-center justify-between mb-4 animate-fade-in-up delay-100">
          <div className="flex items-center gap-1 bg-zinc-100 rounded-lg p-0.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => { setFilter(f.value); setSelected(new Set()); }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  filter === f.value
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                {f.icon}
                {f.label}
                {f.value !== 'all' && statusCounts[f.value] ? (
                  <span className="text-[10px] bg-zinc-200/70 text-zinc-600 rounded-full px-1.5 min-w-[18px] text-center">
                    {statusCounts[f.value]}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white border border-zinc-200 rounded-md pl-8 pr-7 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 focus:shadow-sm w-52 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-20 text-zinc-400 text-sm animate-fade-in">Loading...</div>
        ) : sortedDeals.length === 0 ? (
          <div className="text-center py-24 animate-fade-in-up">
            <Inbox className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">
              {search ? 'No deals match your search.' : 'No deals yet.'}
            </p>
            {!search && (
              <button onClick={pollEmails} className="mt-3 text-blue-600 hover:text-blue-700 text-xs transition-colors">
                Check inbox now
              </button>
            )}
          </div>
        ) : (
          <div className="border border-zinc-200 rounded-lg overflow-hidden animate-fade-in-up delay-150">
            <table className="w-full">
              <thead>
                <tr className="bg-zinc-50 text-left text-[11px] text-zinc-500 uppercase tracking-wider">
                  <th className="pl-4 pr-2 py-2.5 w-10">
                    <input
                      type="checkbox"
                      checked={selected.size === sortedDeals.length && sortedDeals.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-3 py-2.5">
                    <button onClick={() => toggleSort('client')} className="inline-flex items-center gap-1 hover:text-zinc-700 transition-colors">
                      Client <SortIcon field="client" />
                    </button>
                  </th>
                  <th className="px-3 py-2.5">Subject</th>
                  <th className="px-3 py-2.5">
                    <button onClick={() => toggleSort('status')} className="inline-flex items-center gap-1 hover:text-zinc-700 transition-colors">
                      Status <SortIcon field="status" />
                    </button>
                  </th>
                  <th className="px-3 py-2.5">
                    <button onClick={() => toggleSort('progress')} className="inline-flex items-center gap-1 hover:text-zinc-700 transition-colors">
                      Progress <SortIcon field="progress" />
                    </button>
                  </th>
                  <th className="px-3 py-2.5">
                    <button onClick={() => toggleSort('date')} className="inline-flex items-center gap-1 hover:text-zinc-700 transition-colors">
                      Received <SortIcon field="date" />
                    </button>
                  </th>
                  <th className="px-3 py-2.5 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {sortedDeals.map((deal, i) => {
                  const rate = completionRate(deal);
                  const label = completionLabel(rate);
                  return (
                    <tr
                      key={deal.id}
                      onClick={() => router.push(`/dashboard/${deal.id}`)}
                      className={`hover:bg-zinc-50 cursor-pointer transition-all animate-fade-in-up ${
                        selected.has(deal.id) ? 'bg-blue-50/50' : ''
                      }`}
                      style={{ animationDelay: `${150 + i * 40}ms` }}
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
                        <p className="text-sm font-medium text-zinc-900">{deal.client_name}</p>
                        <p className="text-[11px] text-zinc-400">{deal.client_email}</p>
                      </td>
                      <td className="px-3 py-3 text-xs text-zinc-500 max-w-[200px] truncate">
                        {(deal as any).subject_line || '—'}
                      </td>
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="relative group">
                          <StatusBadge status={deal.status} />
                          {/* Quick status change dropdown */}
                          <div className="absolute left-0 top-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg py-1 z-20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all min-w-[140px]">
                            {['new', 'processing', 'ready_for_review', 'completed'].map((s) => (
                              <button
                                key={s}
                                onClick={(e) => updateDealStatus(deal.id, s, e)}
                                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-50 transition-colors flex items-center gap-2 ${
                                  deal.status === s ? 'text-zinc-900 font-medium' : 'text-zinc-600'
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  s === 'new' ? 'bg-blue-400' :
                                  s === 'processing' ? 'bg-amber-400' :
                                  s === 'ready_for_review' ? 'bg-emerald-400' : 'bg-zinc-400'
                                }`} />
                                {s === 'ready_for_review' ? 'Ready for Review' : s.charAt(0).toUpperCase() + s.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all animate-grow-width ${
                                rate >= 80 ? 'bg-emerald-500' : rate >= 40 ? 'bg-blue-500' : rate > 0 ? 'bg-amber-400' : 'bg-zinc-300'
                              }`}
                              style={{ width: `${rate}%`, animationDelay: `${300 + i * 40}ms` }}
                            />
                          </div>
                          <span className={`text-[11px] font-mono w-16 ${
                            rate >= 80 ? 'text-emerald-600' : rate >= 40 ? 'text-blue-600' : 'text-zinc-500'
                          }`}>
                            {rate}% <span className="text-zinc-400 font-sans">{label}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[11px] text-zinc-400">
                        {new Date(deal.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected((prev) => {
                              const next = new Set(prev);
                              next.add(deal.id);
                              return next;
                            });
                          }}
                          className="text-zinc-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                          title="Select for deletion"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
