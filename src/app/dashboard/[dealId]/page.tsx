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
      { key: 'term_months', label: 'Term', suffix: ' Months' },
      { key: 'cltv', label: 'CLTV', suffix: '%' },
    ],
  },
  {
    section: 'Subject Property',
    fields: [
      { key: 'property_address', label: 'Address' },
      { key: 'property_sqft', label: 'Square Footage', suffix: ' sqft' },
      { key: 'property_type', label: 'Property Type' },
      { key: 'bedrooms', label: 'Bedrooms' },
      { key: 'bathrooms', label: 'Bathrooms' },
      { key: 'lot_size', label: 'Lot Size', suffix: ' sqft' },
      { key: 'year_built', label: 'Year Built' },
    ],
  },
  {
    section: '1st Trust Deed',
    fields: [
      { key: 'first_td_balance', label: 'Balance', prefix: '$' },
      { key: 'first_td_monthly_payment', label: 'Monthly Payment', prefix: '$' },
      { key: 'first_td_interest_rate', label: 'Interest Rate', suffix: '%' },
      { key: 'monthly_hoa_fees', label: 'Monthly HOA Fees', prefix: '$' },
    ],
  },
  {
    section: 'Borrower',
    fields: [
      { key: 'borrower_name', label: 'Name' },
      { key: 'borrower_ssn', label: 'SSN' },
      { key: 'borrower_dob', label: 'Date of Birth' },
      { key: 'borrower_phone', label: 'Phone' },
      { key: 'employment', label: 'Employment' },
      { key: 'employment_income', label: 'Employment Income', prefix: '$', suffix: '/mo' },
      { key: 'liquid_assets', label: 'Liquid Assets', prefix: '$' },
      { key: 'rental_income', label: 'Rental Income', prefix: '$' },
      { key: 'mid_fico', label: 'Mid FICO' },
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

  useEffect(() => {
    fetchDeal();
  }, [dealId]);

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
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading deal...
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Deal not found
      </div>
    );
  }

  const missingFields = formData.missing_fields || [];
  const confidenceNotes = formData.confidence_notes || {};

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 sticky top-0 bg-gray-950/80 backdrop-blur-sm z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-semibold">{deal.client_name}</h1>
              <p className="text-xs text-gray-500">{deal.client_email}</p>
            </div>
            <StatusBadge status={deal.status} />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {saved ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saved ? 'Saved' : saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={markComplete}
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-sm px-4 py-2 rounded-lg transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Mark Complete
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="grid grid-cols-3 gap-6">
          {/* Main form — 2 columns */}
          <div className="col-span-2 space-y-6">
            {/* Missing fields warning */}
            {missingFields.length > 0 && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-400">
                    {missingFields.length} fields still missing
                  </p>
                  <p className="text-xs text-amber-400/60 mt-1">
                    {missingFields.join(', ')}
                  </p>
                </div>
              </div>
            )}

            {/* Application form sections */}
            {LOAN_FIELDS.map((section) => (
              <div key={section.section} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-gray-300 mb-4">{section.section}</h2>
                <div className="grid grid-cols-2 gap-4">
                  {section.fields.map((field) => {
                    const value = formData[field.key];
                    const isMissing = missingFields.includes(field.key);
                    const note = confidenceNotes[field.key];

                    return (
                      <div key={field.key} className="space-y-1">
                        <label className="text-xs text-gray-500 flex items-center gap-1">
                          {field.label}
                          {isMissing && (
                            <span className="text-amber-400 text-[10px]">(missing)</span>
                          )}
                          {note && (
                            <span className="text-blue-400 text-[10px]" title={note}>
                              (AI)
                            </span>
                          )}
                        </label>
                        <div className="relative">
                          {field.prefix && (
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
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
                            className={`w-full bg-gray-800 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors ${
                              isMissing
                                ? 'border-amber-500/30'
                                : value
                                ? 'border-gray-700'
                                : 'border-gray-800'
                            } ${field.prefix ? 'pl-7' : ''}`}
                          />
                          {field.suffix && value && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
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

          {/* Sidebar — documents */}
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                Documents ({documents.length})
              </h3>
              {documents.length === 0 ? (
                <p className="text-xs text-gray-500">No documents yet</p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-start gap-2 p-2 rounded-lg bg-gray-800/50"
                    >
                      <FileText className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{doc.file_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-gray-500 uppercase">
                            {doc.doc_type.replace('_', ' ')}
                          </span>
                          <span
                            className={`text-[10px] ${
                              doc.status === 'parsed'
                                ? 'text-green-400'
                                : doc.status === 'failed'
                                ? 'text-red-400'
                                : 'text-amber-400'
                            }`}
                          >
                            {doc.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Raw email preview */}
            {deal.raw_email_body && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Original Email</h3>
                <pre className="text-xs text-gray-400 whitespace-pre-wrap max-h-64 overflow-y-auto font-mono">
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
