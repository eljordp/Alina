'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Deal, Document, LoanApplication } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { ArrowLeft, Save, CheckCircle, FileText, AlertTriangle, Paperclip } from 'lucide-react';

interface FieldConfig {
  key: keyof LoanApplication;
  label: string;
  prefix?: string;
  suffix?: string;
}

const LOAN_FIELDS: { section: string; fields: FieldConfig[] }[] = [
  {
    section: 'Loan Details',
    fields: [
      { key: 'loan_amount', label: 'Loan Amount', prefix: '$' },
      { key: 'property_value', label: 'Property Value', prefix: '$' },
      { key: 'interest_rate', label: 'Interest Rate', suffix: '%' },
      { key: 'protective_equity', label: 'Protective Equity', prefix: '$' },
      { key: 'term_months', label: 'Term', suffix: 'mo' },
      { key: 'cltv', label: 'CLTV', suffix: '%' },
    ],
  },
  {
    section: 'Subject Property',
    fields: [
      { key: 'property_address', label: 'Address' },
      { key: 'property_sqft', label: 'Sq Ft', suffix: 'sqft' },
      { key: 'property_type', label: 'Type' },
      { key: 'bedrooms', label: 'Beds' },
      { key: 'bathrooms', label: 'Baths' },
      { key: 'lot_size', label: 'Lot Size', suffix: 'sqft' },
      { key: 'year_built', label: 'Year Built' },
    ],
  },
  {
    section: '1st Trust Deed',
    fields: [
      { key: 'first_td_balance', label: 'Balance', prefix: '$' },
      { key: 'first_td_monthly_payment', label: 'Monthly Payment', prefix: '$' },
      { key: 'first_td_interest_rate', label: 'Rate', suffix: '%' },
      { key: 'monthly_hoa_fees', label: 'HOA', prefix: '$' },
    ],
  },
  {
    section: 'Borrower',
    fields: [
      { key: 'borrower_name', label: 'Name' },
      { key: 'borrower_ssn', label: 'SSN' },
      { key: 'borrower_dob', label: 'DOB' },
      { key: 'borrower_phone', label: 'Phone' },
      { key: 'employment', label: 'Employment' },
      { key: 'employment_income', label: 'Income', prefix: '$', suffix: '/mo' },
      { key: 'liquid_assets', label: 'Liquid Assets', prefix: '$' },
      { key: 'rental_income', label: 'Rental Income', prefix: '$' },
      { key: 'mid_fico', label: 'FICO' },
    ],
  },
];

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dealId = params.dealId as string;

  const [deal, setDeal] = useState<Deal | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [formData, setFormData] = useState<Partial<LoanApplication>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDeal(); }, [dealId]);

  const fetchDeal = async () => {
    try {
      const res = await fetch(`/api/deals/${dealId}`);
      const data = await res.json();
      setDeal(data.deal);
      setDocuments(data.documents);
      setFormData(data.deal.application_data || {});
    } catch (err) {
      console.error('Failed to fetch deal:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value || null }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_data: formData }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  const markComplete = async () => {
    try {
      await fetch(`/api/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', application_data: formData }),
      });
      router.push('/dashboard');
    } catch (err) {
      console.error('Failed to mark complete:', err);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-zinc-600 text-sm">Loading...</div>;
  }

  if (!deal) {
    return <div className="min-h-screen flex items-center justify-center text-zinc-600 text-sm">Deal not found</div>;
  }

  const missingFields = formData.missing_fields || [];
  const confidenceNotes = formData.confidence_notes || {};

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800/60 px-6 py-3.5 sticky top-0 bg-zinc-950/90 backdrop-blur-sm z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-sm font-semibold text-zinc-200">{deal.client_name}</h1>
              <p className="text-[11px] text-zinc-600">{deal.client_email}</p>
            </div>
            <StatusBadge status={deal.status} />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
            >
              {saved ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
              {saved ? 'Saved' : saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={markComplete}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-md transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Complete
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-5">
        <div className="grid grid-cols-3 gap-5">
          {/* Main form */}
          <div className="col-span-2 space-y-4">
            {/* Missing fields */}
            {missingFields.length > 0 && (
              <div className="bg-amber-500/5 border border-amber-500/15 rounded-lg px-4 py-3 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-amber-300">{missingFields.length} missing fields</p>
                  <p className="text-[11px] text-amber-400/50 mt-0.5">{missingFields.join(', ')}</p>
                </div>
              </div>
            )}

            {/* Form sections */}
            {LOAN_FIELDS.map((section) => (
              <div key={section.section} className="border border-zinc-800/60 rounded-lg p-4">
                <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">{section.section}</h2>
                <div className="grid grid-cols-2 gap-3">
                  {section.fields.map((field) => {
                    const value = formData[field.key];
                    const isMissing = missingFields.includes(field.key);
                    const note = confidenceNotes[field.key];

                    return (
                      <div key={field.key} className="space-y-1">
                        <label className="text-[11px] text-zinc-500 flex items-center gap-1">
                          {field.label}
                          {isMissing && <span className="text-amber-400">&middot;</span>}
                          {note && (
                            <span className="text-blue-400 cursor-help" title={note}>
                              AI
                            </span>
                          )}
                        </label>
                        <div className="relative">
                          {field.prefix && (
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600 text-xs">
                              {field.prefix}
                            </span>
                          )}
                          <input
                            type="text"
                            value={
                              value !== null && value !== undefined && typeof value !== 'object'
                                ? String(value)
                                : ''
                            }
                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                            placeholder="—"
                            className={`w-full bg-zinc-900 border rounded-md px-2.5 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors ${
                              isMissing ? 'border-amber-500/20' : 'border-zinc-800'
                            } ${field.prefix ? 'pl-6' : ''}`}
                          />
                          {field.suffix && value && (
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 text-[11px]">
                              {field.suffix}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Documents */}
            <div className="border border-zinc-800/60 rounded-lg p-4">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5" />
                Documents ({documents.length})
              </h3>
              {documents.length === 0 ? (
                <p className="text-[11px] text-zinc-600">No documents</p>
              ) : (
                <div className="space-y-1.5">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-start gap-2 p-2 rounded-md bg-zinc-900/50">
                      <FileText className="w-3.5 h-3.5 text-zinc-600 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-zinc-300 truncate">{doc.file_name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-zinc-600 uppercase">{doc.doc_type.replace('_', ' ')}</span>
                          <span className={`text-[10px] ${
                            doc.status === 'parsed' ? 'text-emerald-500' : doc.status === 'failed' ? 'text-red-400' : 'text-amber-500'
                          }`}>
                            {doc.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Original email */}
            {deal.raw_email_body && (
              <div className="border border-zinc-800/60 rounded-lg p-4">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Original Email</h3>
                <pre className="text-[11px] text-zinc-500 whitespace-pre-wrap max-h-60 overflow-y-auto font-mono leading-relaxed">
                  {deal.raw_email_body}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
