'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Deal, Document, LoanApplication } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { ArrowLeft, Save, CheckCircle, FileText, AlertTriangle, Paperclip, ChevronRight, Download, Mail, Eye, X, Clock } from 'lucide-react';
import { generateLoanPDF } from '@/lib/generate-pdf';

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

const STATUS_STEPS = [
  { key: 'new', label: 'New' },
  { key: 'processing', label: 'Processing' },
  { key: 'ready_for_review', label: 'Review' },
  { key: 'completed', label: 'Complete' },
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
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [activities, setActivities] = useState<{ id: string; action: string; details: string; created_at: string }[]>([]);

  useEffect(() => { fetchDeal(); fetchActivities(); }, [dealId]);

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

  const fetchActivities = async () => {
    try {
      const res = await fetch(`/api/activity?dealId=${dealId}`);
      const data = await res.json();
      if (Array.isArray(data)) setActivities(data);
    } catch (err) {
      // activity log table may not exist yet
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

  const updateStatus = async (status: string) => {
    try {
      await fetch(`/api/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, application_data: formData }),
      });
      if (status === 'completed') {
        router.push('/dashboard');
      } else {
        await fetchDeal();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const exportPDF = () => {
    if (!deal) return;
    const pdf = generateLoanPDF(formData, deal.client_name, deal.client_email, deal.created_at);
    pdf.save(`${deal.client_name.replace(/[^a-zA-Z0-9]/g, '_')}_loan_application.pdf`);
  };

  const generateFollowUpEmail = () => {
    const missing = formData.missing_fields || [];
    if (missing.length === 0) return '';
    const fieldNames = missing.map((f: string) => f.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()));
    const list = fieldNames.map((f: string) => `  - ${f}`).join('\n');
    return `Hi ${deal?.client_name || 'there'},

Thank you for submitting your loan application. We've reviewed your documents and are missing a few pieces of information to complete processing:

${list}

Could you please send these over at your earliest convenience? You can reply to this email with the documents attached.

Thank you,
Loan Processing Team`;
  };

  if (loading) {
    return <div className="min-h-screen bg-white flex items-center justify-center text-zinc-400 text-sm">Loading...</div>;
  }

  if (!deal) {
    return <div className="min-h-screen bg-white flex items-center justify-center text-zinc-400 text-sm">Deal not found</div>;
  }

  const missingFields = formData.missing_fields || [];
  const confidenceNotes = formData.confidence_notes || {};
  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === deal.status);

  // Completion stats
  const allFields = LOAN_FIELDS.flatMap((s) => s.fields);
  const filledCount = allFields.filter((f) => {
    const v = formData[f.key];
    return v !== null && v !== undefined && v !== '';
  }).length;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-zinc-200 px-6 py-3.5 sticky top-0 bg-white/90 backdrop-blur-sm z-10 animate-slide-down">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-sm font-semibold text-zinc-900">{deal.client_name}</h1>
              <p className="text-[11px] text-zinc-400">{deal.client_email}</p>
            </div>
            <StatusBadge status={deal.status} />
            <span className="text-[11px] text-zinc-400 bg-zinc-100 rounded-md px-2 py-0.5 font-mono">
              {filledCount}/{allFields.length} fields
            </span>
          </div>
          <div className="flex items-center gap-2">
            {(formData.missing_fields || []).length > 0 && (
              <button
                onClick={() => setShowFollowUp(!showFollowUp)}
                className="inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs px-3 py-1.5 rounded-md transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
                Follow Up
              </button>
            )}
            <button
              onClick={exportPDF}
              className="inline-flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs px-3 py-1.5 rounded-md transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              PDF
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
            >
              {saved ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Save className="w-3.5 h-3.5" />}
              {saved ? 'Saved' : saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => updateStatus('completed')}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-md transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Complete
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-5">
        {/* Status workflow stepper */}
        <div className="mb-5 animate-fade-in-up delay-100">
          <div className="flex items-center gap-1">
            {STATUS_STEPS.map((step, i) => {
              const isActive = i === currentStepIndex;
              const isDone = i < currentStepIndex;
              return (
                <div key={step.key} className="flex items-center flex-1">
                  <button
                    onClick={() => updateStatus(step.key)}
                    className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all text-center ${
                      isActive
                        ? 'bg-zinc-900 text-white shadow-sm'
                        : isDone
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-zinc-50 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600'
                    }`}
                  >
                    {isDone && <CheckCircle className="w-3 h-3 inline mr-1 -mt-0.5" />}
                    {step.label}
                  </button>
                  {i < STATUS_STEPS.length - 1 && (
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-300 mx-1 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-5">
          {/* Main form */}
          <div className="col-span-2 space-y-4">
            {/* Missing fields */}
            {missingFields.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-2.5 animate-fade-in-up delay-150">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-amber-800">{missingFields.length} missing fields</p>
                  <p className="text-[11px] text-amber-600 mt-0.5">{missingFields.join(', ')}</p>
                </div>
              </div>
            )}

            {/* Form sections */}
            {LOAN_FIELDS.map((section, si) => {
              const sectionFilled = section.fields.filter((f) => {
                const v = formData[f.key];
                return v !== null && v !== undefined && v !== '';
              }).length;

              return (
                <div
                  key={section.section}
                  className="border border-zinc-200 rounded-lg p-4 animate-fade-in-up"
                  style={{ animationDelay: `${200 + si * 80}ms` }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{section.section}</h2>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      sectionFilled === section.fields.length
                        ? 'bg-emerald-50 text-emerald-600'
                        : sectionFilled > 0
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-zinc-50 text-zinc-400'
                    }`}>
                      {sectionFilled}/{section.fields.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {section.fields.map((field) => {
                      const value = formData[field.key];
                      const isMissing = missingFields.includes(field.key);
                      const note = confidenceNotes[field.key];
                      const isFilled = value !== null && value !== undefined && value !== '';

                      return (
                        <div key={field.key} className="space-y-1">
                          <label className="text-[11px] text-zinc-500 flex items-center gap-1">
                            {field.label}
                            {isMissing && <span className="text-amber-500">&middot;</span>}
                            {note && (
                              <span className="text-blue-500 cursor-help text-[9px] bg-blue-50 rounded px-1" title={note}>
                                AI
                              </span>
                            )}
                            {isFilled && !isMissing && (
                              <CheckCircle className="w-2.5 h-2.5 text-emerald-400" />
                            )}
                          </label>
                          <div className="relative">
                            {field.prefix && (
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">
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
                              className={`w-full bg-white border rounded-md px-2.5 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-zinc-400 focus:shadow-sm transition-all ${
                                isMissing ? 'border-amber-300' : isFilled ? 'border-zinc-200' : 'border-zinc-100'
                              } ${field.prefix ? 'pl-6' : ''}`}
                            />
                            {field.suffix && value && (
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-[11px]">
                                {field.suffix}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Documents */}
            <div className="border border-zinc-200 rounded-lg p-4 animate-fade-in-up delay-200">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5" />
                Documents ({documents.length})
              </h3>
              {documents.length === 0 ? (
                <p className="text-[11px] text-zinc-400">No documents</p>
              ) : (
                <div className="space-y-1.5">
                  {documents.map((doc, di) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-2 p-2 rounded-md bg-zinc-50 hover:bg-zinc-100 transition-colors animate-fade-in-up cursor-pointer"
                      style={{ animationDelay: `${300 + di * 60}ms` }}
                      onClick={() => setViewingDoc(doc)}
                    >
                      <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium text-zinc-700 truncate">{doc.file_name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-zinc-400 uppercase">{doc.doc_type.replace('_', ' ')}</span>
                          <span className={`text-[10px] ${
                            doc.status === 'parsed' ? 'text-emerald-600' : doc.status === 'failed' ? 'text-red-500' : 'text-amber-500'
                          }`}>
                            {doc.status}
                          </span>
                        </div>
                      </div>
                      <Eye className="w-3 h-3 text-zinc-300 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Original email */}
            {deal.raw_email_body && (
              <div className="border border-zinc-200 rounded-lg p-4 animate-fade-in-up delay-300">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Original Email</h3>
                <pre className="text-[11px] text-zinc-600 whitespace-pre-wrap max-h-60 overflow-y-auto font-mono leading-relaxed">
                  {deal.raw_email_body}
                </pre>
              </div>
            )}

            {/* Activity timeline */}
            {activities.length > 0 && (
              <div className="border border-zinc-200 rounded-lg p-4 animate-fade-in-up delay-400">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Activity
                </h3>
                <div className="space-y-0">
                  {activities.map((activity, i) => {
                    const icons: Record<string, string> = {
                      deal_created: '+ ',
                      email_received: '@ ',
                      document_parsed: '# ',
                      status_changed: '> ',
                      application_saved: '~ ',
                    };
                    return (
                      <div key={activity.id} className="flex gap-2 py-1.5 border-b border-zinc-50 last:border-0">
                        <span className="text-[10px] font-mono text-zinc-300 shrink-0 mt-0.5">{icons[activity.action] || '  '}</span>
                        <div className="min-w-0">
                          <p className="text-[11px] text-zinc-700">{activity.details}</p>
                          <p className="text-[10px] text-zinc-400">
                            {new Date(activity.created_at).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Follow-up email panel */}
        {showFollowUp && (
          <div className="mt-5 border border-amber-200 bg-amber-50/50 rounded-lg p-5 animate-scale-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                Follow-Up Email Draft
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const text = generateFollowUpEmail();
                    navigator.clipboard.writeText(text);
                  }}
                  className="text-[11px] text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded transition-colors"
                >
                  Copy to Clipboard
                </button>
                <button
                  onClick={() => {
                    const text = generateFollowUpEmail();
                    const subject = encodeURIComponent(`Follow Up: Loan Application - Missing Documents`);
                    const body = encodeURIComponent(text);
                    window.open(`mailto:${deal.client_email}?subject=${subject}&body=${body}`);
                  }}
                  className="text-[11px] text-white bg-amber-600 hover:bg-amber-700 px-2.5 py-1 rounded transition-colors"
                >
                  Open in Email
                </button>
                <button onClick={() => setShowFollowUp(false)} className="text-amber-400 hover:text-amber-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <pre className="text-[12px] text-amber-900 whitespace-pre-wrap font-mono leading-relaxed bg-white border border-amber-200 rounded-md p-4">
              {generateFollowUpEmail()}
            </pre>
          </div>
        )}
      </div>

      {/* Document viewer modal */}
      {viewingDoc && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6 animate-fade-in" onClick={() => setViewingDoc(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">{viewingDoc.file_name}</h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {viewingDoc.doc_type.replace('_', ' ').toUpperCase()} &middot; {viewingDoc.status}
                </p>
              </div>
              <button onClick={() => setViewingDoc(null)} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto grid grid-cols-2 divide-x divide-zinc-200">
              {/* Document preview */}
              <div className="p-5 flex items-center justify-center bg-zinc-50">
                {viewingDoc.file_url ? (
                  viewingDoc.file_name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img src={viewingDoc.file_url} alt={viewingDoc.file_name} className="max-w-full max-h-[60vh] object-contain rounded" />
                  ) : viewingDoc.file_name.match(/\.pdf$/i) ? (
                    <iframe src={viewingDoc.file_url} className="w-full h-[60vh] rounded" />
                  ) : (
                    <div className="text-center text-zinc-400">
                      <FileText className="w-12 h-12 mx-auto mb-2" />
                      <p className="text-sm">Preview not available</p>
                      <a href={viewingDoc.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs mt-1 inline-block hover:underline">
                        Open file
                      </a>
                    </div>
                  )
                ) : (
                  <div className="text-center text-zinc-400">
                    <FileText className="w-12 h-12 mx-auto mb-2" />
                    <p className="text-sm">No preview available</p>
                  </div>
                )}
              </div>
              {/* Extracted data */}
              <div className="p-5 overflow-auto">
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Extracted Data</h4>
                {viewingDoc.extracted_data && Object.keys(viewingDoc.extracted_data).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(viewingDoc.extracted_data)
                      .filter(([k]) => k !== 'missing_fields' && k !== 'confidence_notes')
                      .map(([key, value]) => (
                        <div key={key} className="flex justify-between items-start py-1.5 border-b border-zinc-50">
                          <span className="text-[11px] text-zinc-500">{key.replace(/_/g, ' ')}</span>
                          <span className="text-[11px] text-zinc-900 font-medium text-right max-w-[60%]">
                            {value !== null && value !== undefined ? String(value) : '—'}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-zinc-400">No data extracted from this document</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
