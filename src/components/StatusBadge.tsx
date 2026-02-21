import { DealStatus } from '@/lib/types';

const statusConfig: Record<DealStatus, { label: string; className: string }> = {
  new: { label: 'New', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  processing: { label: 'Processing', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  ready_for_review: { label: 'Ready for Review', className: 'bg-green-500/10 text-green-400 border-green-500/20' },
  completed: { label: 'Completed', className: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
};

export function StatusBadge({ status }: { status: DealStatus }) {
  const config = statusConfig[status] || statusConfig.new;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>
      {config.label}
    </span>
  );
}
