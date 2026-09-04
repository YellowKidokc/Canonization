import { FileJson, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader, Loading, ErrorBox, EmptyState, shortSha, fmtDate } from "@/components/common";
import { useExports, useExport } from "@/lib/hooks";

export default function Exports() {
  const exports = useExports();
  const exportJson = useExport("json");
  const exportMd = useExport("markdown");
  const pending = exportJson.isPending || exportMd.isPending;

  return (
    <div>
      <PageHeader kicker="Exchange" title="Exports" />

      <p className="text-xs font-serif text-muted-foreground mb-4 max-w-2xl">
        JSON is the authoritative exchange format; Markdown is a labeled projection.
        Every export is hashed and receipted.
      </p>

      <div className="flex items-center gap-3 mb-8">
        <Button onClick={() => exportJson.mutate()} disabled={pending}>
          <FileJson className="w-4 h-4" /> Export JSON
        </Button>
        <Button variant="outline" onClick={() => exportMd.mutate()} disabled={pending}>
          <FileText className="w-4 h-4" /> Export Markdown
        </Button>
        {pending && <span className="kicker text-primary">Writing export…</span>}
        {exportJson.isSuccess && (
          <span className="kicker text-green-400">JSON receipted — {shortSha(exportJson.data.sha256)}</span>
        )}
        {exportMd.isSuccess && (
          <span className="kicker text-green-400">Markdown receipted — {shortSha(exportMd.data.sha256)}</span>
        )}
      </div>
      {(exportJson.isError || exportMd.isError) && (
        <div className="mb-6 space-y-2">
          {exportJson.isError && <ErrorBox error={exportJson.error} />}
          {exportMd.isError && <ErrorBox error={exportMd.error} />}
        </div>
      )}

      <h2 className="font-display text-lg font-bold text-foreground mb-3">Receipts</h2>
      {exports.isLoading && <Loading />}
      {exports.isError && <ErrorBox error={exports.error} />}
      {exports.data?.length === 0 && (
        <EmptyState title="No exports yet" hint="Export the current canon to produce a hash-verified receipt." />
      )}
      {exports.data && exports.data.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kind</TableHead>
              <TableHead>File</TableHead>
              <TableHead>SHA-256</TableHead>
              <TableHead>Objects</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exports.data.map((e) => (
              <TableRow key={e.id}>
                <TableCell>
                  <Badge variant="gold" className="kicker">{e.kind}</Badge>
                </TableCell>
                <TableCell className="font-mono text-[10px] text-muted-foreground max-w-[320px]">
                  <span className="line-clamp-1">{e.path.split(/[\\/]/).pop()}</span>
                </TableCell>
                <TableCell className="font-mono text-[10px] text-muted-foreground">{shortSha(e.sha256)}</TableCell>
                <TableCell className="font-mono text-xs">{e.object_count ?? "—"}</TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">{fmtDate(e.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
