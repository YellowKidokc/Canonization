import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CanonBadge } from "@/components/canon-badge";
import { PageHeader, Loading, ErrorBox, EmptyState, fmtDate } from "@/components/common";
import { useDashboard, useSearch } from "@/lib/hooks";
import { useDebounced } from "@/lib/use-debounced";
import type { Dashboard, SearchResult } from "@/lib/types";

/** Where each dashboard metric takes you. */
const METRIC_TARGETS: Record<string, { href: string; label: string }> = {
  sources: { href: "/intake", label: "Open intake queue" },
  jobs_running: { href: "/intake", label: "Watch pipeline progress" },
  jobs_failed: { href: "/intake", label: "Inspect failed jobs" },
  rulings_required: { href: "/review", label: "Rule on under-review objects" },
  candidates: { href: "/review", label: "Review candidates" },
  canonical: { href: "/canon", label: "Open canon timeline" },
  discovery_commons: { href: "/discovery", label: "Browse Discovery Commons" },
  unanswered_questions: { href: "/review", label: "Answer questions" },
  claims_lacking_evidence: { href: "/review", label: "Attach evidence" },
  evidence_lacking_edges: { href: "/evidence", label: "Connect evidence" },
  untested_predictions: { href: "/predictions", label: "Test predictions" },
  active_contradictions: { href: "/review", label: "Resolve contradictions" },
  canon_version: { href: "/canon", label: "Canon history" },
};

const METRIC_LABELS: Record<string, string> = {
  sources: "Intake queue / sources",
  jobs_running: "Jobs in progress",
  jobs_failed: "Failed jobs",
  failure_receipts: "Failure receipts",
  rulings_required: "Rulings required",
  candidates: "Candidates awaiting ruling",
  canonical: "Canonical objects",
  discovery_commons: "Discovery Commons entries",
  unanswered_questions: "Unanswered questions",
  claims_lacking_evidence: "Claims lacking evidence",
  evidence_lacking_edges: "Evidence lacking edges",
  untested_predictions: "Untested predictions",
  active_contradictions: "Active contradictions",
  canon_version: "Canon version",
};

function resultHref(r: SearchResult): string {
  switch (r.object_type) {
    case "TRUE_STATEMENT":
    case "QUESTION":
    case "CLAIM":
      return r.source_id ? `/review/${r.source_id}` : "/review";
    case "EVIDENCE":
      return "/evidence";
    case "PREDICTION":
      return "/predictions";
    case "DISCOVERY_COMMONS":
      return "/discovery";
    default:
      return "/canon";
  }
}

function SearchBar() {
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 300);
  const search = useSearch(dq);

  return (
    <div className="relative mb-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className="flex items-center gap-2 border border-border bg-card rounded-md px-3 focus-within:ring-1 focus-within:ring-ring">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search the corpus — text or exact UUID…"
          className="border-0 shadow-none focus-visible:ring-0 font-serif text-base h-11"
        />
      </div>
      {dq.trim() && (
        <div className="absolute z-30 left-0 right-0 top-full mt-1 border border-border bg-popover rounded-md shadow-lg max-h-96 overflow-y-auto scrollbar-thin">
          {search.isLoading && <Loading />}
          {search.isError && <div className="p-3"><ErrorBox error={search.error} /></div>}
          {search.data && search.data.results.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground font-serif">Nothing in the corpus matches.</div>
          )}
          {search.data?.results.map((r) => (
            <Link key={r.object_uuid} href={resultHref(r)}>
              <div className="px-4 py-3 border-b border-border/50 last:border-0 hover:bg-primary/5 cursor-pointer group">
                <div className="flex items-center gap-2 mb-1">
                  <span className="kicker text-primary/70">{r.object_type}</span>
                  {r.statement_mode && <span className="kicker text-muted-foreground/60">{r.statement_mode}</span>}
                  <CanonBadge status={r.canon_status} />
                </div>
                <p className="text-sm text-foreground group-hover:translate-x-1 transition-transform font-serif">{r.title}</p>
                {r.snippet && r.snippet !== r.title && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 font-serif">{r.snippet}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function MetricCard({ name, value, dash }: { name: string; value: number; dash: Dashboard }) {
  const target = METRIC_TARGETS[name];
  const recentFailures = name === "jobs_failed" ? dash.failure_receipts : undefined;
  return (
    <Link href={target?.href ?? "/"}>
      <Card className="bg-card border border-border/50 hover:border-primary/50 transition-all duration-300 group overflow-hidden cursor-pointer h-full">
        <CardHeader className="pb-2 relative">
          <p className="kicker text-muted-foreground mb-2">{METRIC_LABELS[name] ?? name}</p>
          <CardTitle className="font-display font-bold text-4xl text-foreground group-hover:text-primary transition-colors">
            {value}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="max-h-0 group-hover:max-h-24 transition-[max-height] duration-500 ease-in-out overflow-hidden opacity-0 group-hover:opacity-100">
            <div className="pt-3 border-t border-border/30 mt-1">
              <div className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                {target?.label ?? "Open"} <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
              {recentFailures !== undefined && recentFailures > 0 && (
                <p className="text-[10px] font-mono text-red-400 mt-1">{recentFailures} failure receipt{recentFailures === 1 ? "" : "s"} recorded</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function Home() {
  const dash = useDashboard();
  const [, navigate] = useLocation();

  return (
    <div>
      <PageHeader kicker="Control Center" title="Canon at a Glance" />
      <SearchBar />

      {dash.isLoading && <Loading text="Reading the dashboard…" />}
      {dash.isError && <ErrorBox error={dash.error} />}
      {dash.data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {(Object.keys(METRIC_LABELS) as (keyof Dashboard)[])
              .filter((k) => typeof dash.data![k] === "number")
              .map((k) => (
                <MetricCard key={k} name={k} value={dash.data![k] as number} dash={dash.data!} />
              ))}
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-bold text-foreground">Recent Rulings</h2>
              <button
                onClick={() => navigate("/canon")}
                className="kicker text-primary flex items-center gap-1 hover:translate-x-1 transition-transform"
              >
                Full history <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            {dash.data.recent_rulings.length === 0 ? (
              <EmptyState title="No rulings yet" hint="Human rulings — promote, defer, reject — will appear here once recorded." />
            ) : (
              <div className="border border-border/50 rounded-md divide-y divide-border/50">
                {dash.data.recent_rulings.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-primary/5">
                    <span className="kicker text-primary w-20 shrink-0">{r.decision}</span>
                    <span className="kicker text-muted-foreground w-36 shrink-0 hidden md:inline">{r.object_type}</span>
                    <span className="text-xs text-muted-foreground font-mono truncate flex-1">
                      {r.prior_status} → {r.new_status}
                    </span>
                    <span className="text-xs text-muted-foreground font-serif hidden lg:inline truncate max-w-xs">{r.reason}</span>
                    <span className="text-[10px] font-mono text-muted-foreground/60 shrink-0">{fmtDate(r.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
