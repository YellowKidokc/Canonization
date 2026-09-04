import { useState } from "react";
import { useSearch } from "wouter";
import { ArrowRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader, Loading, ErrorBox, EmptyState, fmtDate } from "@/components/common";
import { useCanonVersions, useRulings, useAuditTrail } from "@/lib/hooks";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

function CanonTimeline() {
  const versions = useCanonVersions();
  const [atVersion, setAtVersion] = useState<number | null>(null);

  const at = useQuery({
    queryKey: ["canon-at", atVersion],
    queryFn: () => api.get<{ version: number; canonical_objects: { object_type: string; object_uuid: string; title: string }[] }>(`/api/canon/at/${atVersion}`),
    enabled: atVersion !== null,
  });

  return (
    <div>
      <h2 className="font-display text-lg font-bold text-foreground mb-3">Canon Version Timeline</h2>
      {versions.isLoading && <Loading />}
      {versions.isError && <ErrorBox error={versions.error} />}
      {versions.data?.length === 0 && <EmptyState title="No canon versions yet" hint="Each ruling that changes status mints a new canon version." />}
      {versions.data && versions.data.length > 0 && (
        <div className="space-y-0">
          {versions.data.map((v, i) => (
            <div key={v.version} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={cn(
                  "w-3 h-3 rounded-full border-2 shrink-0 mt-1",
                  i === 0 ? "border-primary bg-primary shadow-[0_0_8px_rgba(212,175,55,0.6)]" : "border-muted-foreground/50 bg-background"
                )} />
                {i < versions.data.length - 1 && <div className="w-px flex-1 bg-border" />}
              </div>
              <button
                className="pb-5 text-left group flex-1"
                onClick={() => setAtVersion(atVersion === v.version ? null : v.version)}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm text-primary">v{v.version}</span>
                  <span className="text-xs font-serif text-muted-foreground group-hover:text-foreground transition-colors">{v.label}</span>
                  <span className="text-[10px] font-mono text-muted-foreground/60 ml-auto">{fmtDate(v.created_at)}</span>
                </div>
                {atVersion === v.version && (
                  <div className="mt-2 border border-border/50 rounded-md p-3 bg-black/30 animate-in fade-in">
                    {at.isLoading && <Loading />}
                    {at.isError && <ErrorBox error={at.error} />}
                    {at.data && (
                      at.data.canonical_objects.length === 0 ? (
                        <p className="text-xs text-muted-foreground font-serif">The canon was empty at this version.</p>
                      ) : (
                        <ul className="space-y-1">
                          {at.data.canonical_objects.map((o) => (
                            <li key={o.object_uuid} className="text-xs font-serif flex items-center gap-2">
                              <Badge variant="outline" className="kicker">{o.object_type}</Badge>
                              <span className="truncate">{o.title}</span>
                            </li>
                          ))}
                        </ul>
                      )
                    )}
                  </div>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AuditLookup({ initialUuid }: { initialUuid: string }) {
  const [input, setInput] = useState(initialUuid);
  const [lookup, setLookup] = useState(initialUuid);
  const audit = useAuditTrail(lookup.trim() || null);

  return (
    <div>
      <h2 className="font-display text-lg font-bold text-foreground mb-3">Audit Trail Lookup</h2>
      <form
        className="flex items-center gap-2 mb-4"
        onSubmit={(e) => { e.preventDefault(); setLookup(input); }}
      >
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Object UUID — proof of the admission path"
          className="font-mono text-xs"
        />
        <button type="submit" className="kicker text-primary whitespace-nowrap flex items-center gap-1 hover:translate-x-1 transition-transform">
          Trace <ArrowRight className="w-3 h-3" />
        </button>
      </form>

      {audit.isLoading && <Loading />}
      {audit.isError && <ErrorBox error={audit.error} />}
      {audit.data && (
        <div className="space-y-6">
          <div>
            <h3 className="kicker text-primary/70 mb-2">Rulings ({audit.data.rulings.length})</h3>
            {audit.data.rulings.length === 0 ? (
              <p className="text-xs text-muted-foreground font-serif">No rulings recorded for this object.</p>
            ) : (
              <div className="border border-border/50 rounded-md divide-y divide-border/50">
                {audit.data.rulings.map((r) => (
                  <div key={r.id} className="px-4 py-3">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant="gold" className="kicker">{r.decision}</Badge>
                      <span className="text-[10px] font-mono text-muted-foreground">{r.prior_status} → {r.new_status}</span>
                      <span className="text-[10px] font-mono text-muted-foreground/60 ml-auto">
                        {r.decided_by} · canon v{r.canon_version} · {fmtDate(r.created_at)}
                      </span>
                    </div>
                    <p className="text-xs font-serif text-muted-foreground">{r.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <h3 className="kicker text-primary/70 mb-2">Status Audit Rows ({audit.data.status_audit.length})</h3>
            {audit.data.status_audit.length === 0 ? (
              <p className="text-xs text-muted-foreground font-serif">No raw status transitions recorded.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Table</TableHead>
                    <TableHead>Old Status</TableHead>
                    <TableHead>New Status</TableHead>
                    <TableHead>Changed At</TableHead>
                    <TableHead>TX</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {audit.data.status_audit.map((a, i) => (
                    <TableRow key={i}>
                      <TableCell className="kicker text-muted-foreground">{a.table_name}</TableCell>
                      <TableCell className="text-xs font-mono text-red-400/80">{a.old_status}</TableCell>
                      <TableCell className="text-xs font-mono text-green-400/80">{a.new_status}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{fmtDate(a.changed_at)}</TableCell>
                      <TableCell className="text-[10px] font-mono text-muted-foreground/60">{String(a.txid)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Canon() {
  const rulings = useRulings();
  const search = useSearch();
  const paramUuid = new URLSearchParams(search).get("uuid") ?? "";

  return (
    <div>
      <PageHeader kicker="Governance" title="Canon & Rulings" />

      <div className="grid xl:grid-cols-2 gap-10">
        <div className="space-y-10">
          <CanonTimeline />
          <AuditLookup initialUuid={paramUuid} />
        </div>

        <div>
          <h2 className="font-display text-lg font-bold text-foreground mb-3">Rulings</h2>
          {rulings.isLoading && <Loading />}
          {rulings.isError && <ErrorBox error={rulings.error} />}
          {rulings.data?.length === 0 && (
            <EmptyState title="No rulings recorded" hint="Every admission, rejection, and deferral lands here with its reason." />
          )}
          {rulings.data && rulings.data.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Decision</TableHead>
                  <TableHead>Object</TableHead>
                  <TableHead>Transition</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead>Canon</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rulings.data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell><Badge variant="gold" className="kicker">{r.decision}</Badge></TableCell>
                    <TableCell className="kicker text-muted-foreground whitespace-nowrap">{r.object_type}</TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground max-w-[180px]">
                      <span className="text-red-400/70">{r.prior_status}</span>
                      <ArrowRight className="inline w-3 h-3 mx-0.5 text-muted-foreground" />
                      <span className="text-green-400/70">{r.new_status}</span>
                    </TableCell>
                    <TableCell className="font-serif text-xs max-w-[220px]"><span className="line-clamp-2">{r.reason}</span></TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{r.decided_by}</TableCell>
                    <TableCell className="font-mono text-xs text-primary">v{r.canon_version}</TableCell>
                    <TableCell className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">{fmtDate(r.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
