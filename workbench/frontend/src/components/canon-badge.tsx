import { cn } from "@/lib/utils";

/** Color map for canon_status (backend STATUS_COLORS):
 *  candidate blue, under review yellow, canonical green,
 *  rejected/contradicted red, deferred slate, superseded purple. */
const STATUS_STYLES: Record<string, string> = {
  "CANDIDATE_DRAFT — NOT ADMITTED": "border-blue-500/50 bg-blue-500/10 text-blue-400",
  "UNDER_REVIEW": "border-yellow-500/50 bg-yellow-500/10 text-yellow-400",
  "CANONICAL": "border-green-500/50 bg-green-500/10 text-green-400",
  "DEFERRED": "border-slate-500/50 bg-slate-500/10 text-slate-400",
  "REJECTED": "border-red-500/50 bg-red-500/10 text-red-400",
  "CONTRADICTED": "border-red-500/50 bg-red-500/10 text-red-400",
  "SUPERSEDED": "border-purple-500/50 bg-purple-500/10 text-purple-400",
};

const DOT_COLORS: Record<string, string> = {
  "CANDIDATE_DRAFT — NOT ADMITTED": "bg-blue-500",
  "UNDER_REVIEW": "bg-yellow-500",
  "CANONICAL": "bg-green-500",
  "DEFERRED": "bg-slate-500",
  "REJECTED": "bg-red-500",
  "CONTRADICTED": "bg-red-500",
  "SUPERSEDED": "bg-purple-500",
};

export function statusColor(status: string): string {
  return DOT_COLORS[status] ?? "bg-slate-500";
}

export function CanonBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest whitespace-nowrap",
        STATUS_STYLES[status] ?? "border-slate-500/50 bg-slate-500/10 text-slate-400",
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", statusColor(status))} />
      {status}
    </span>
  );
}
