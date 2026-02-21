import { DealStatus } from '@/lib/types';

const statusConfig: Record<DealStatus, { label: string; dot: string }> = {
  new: { label: 'New', dot: 'bg-blue-400' },
  processing: { label: 'Processing', dot: 'bg-amber-400' },
  ready_for_review: { label: 'Ready', dot: 'bg-emerald-400' },
  completed: { label: 'Done', dot: 'bg-zinc-500' },
};

export function StatusBadge({ status }: { status: DealStatus }) {
  const config = statusConfig[status] || statusConfig.new;

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-300">
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
