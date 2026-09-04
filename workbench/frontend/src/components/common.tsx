import { AlertTriangle, Inbox } from "lucide-react";

export function PageHeader({ kicker, title, children }: { kicker: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
      <p className="kicker text-primary/60 mb-1">{kicker}</p>
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">{title}</h1>
        {children}
      </div>
    </div>
  );
}

export function Loading({ text = "Loading…" }: { text?: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground text-sm py-8 justify-center">
      <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
      {text}
    </div>
  );
}

export function ErrorBox({ error }: { error: unknown }) {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    <div className="flex items-start gap-2 rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-400 font-mono">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <span>{msg}</span>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Inbox className="w-8 h-8 text-muted-foreground/40 mb-3" />
      <p className="font-display text-sm text-muted-foreground">{title}</p>
      {hint && <p className="text-xs text-muted-foreground/60 mt-1 max-w-sm font-serif">{hint}</p>}
    </div>
  );
}

export function shortSha(sha: string): string {
  return sha ? `${sha.slice(0, 12)}…` : "—";
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}
