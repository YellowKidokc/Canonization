import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { FolderInput, Play, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { PageHeader, Loading, ErrorBox, EmptyState, shortSha, fmtDate } from "@/components/common";
import {
  useSources, useJobs, useCreateJob, useUploadSource, useIntakeFolder, useJobEvents, useFailures,
} from "@/lib/hooks";
import { cn } from "@/lib/utils";
import type { Job, Source } from "@/lib/types";

const JOB_BADGE: Record<string, string> = {
  PENDING: "border-slate-500/50 bg-slate-500/10 text-slate-400",
  RUNNING: "border-yellow-500/50 bg-yellow-500/10 text-yellow-400",
  SUCCEEDED: "border-green-500/50 bg-green-500/10 text-green-400",
  FAILED: "border-red-500/50 bg-red-500/10 text-red-400",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("font-mono", JOB_BADGE[status] ?? JOB_BADGE.PENDING)}>
      {status}
    </Badge>
  );
}

function UploadZone() {
  const upload = useUploadSource();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const doUpload = (file: File) => {
    const form = new FormData();
    form.append("file", file);
    upload.mutate(form);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) doUpload(file);
      }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "border border-dashed rounded-md p-8 text-center cursor-pointer transition-colors mb-4",
        dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
      )}
    >
      <UploadCloud className="w-8 h-8 text-primary mx-auto mb-2" />
      <p className="font-serif text-sm text-muted-foreground">
        Drop a markdown source here, or click to pick a file.
      </p>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) doUpload(file);
          e.target.value = "";
        }}
      />
      {upload.isPending && <p className="kicker text-primary mt-3">Ingesting…</p>}
      {upload.isError && <div className="mt-3"><ErrorBox error={upload.error} /></div>}
      {upload.isSuccess && (
        <p className="kicker text-green-400 mt-3">Imported {upload.data.original_filename}</p>
      )}
    </div>
  );
}

function FolderIntake() {
  const intake = useIntakeFolder();
  const [path, setPath] = useState("");

  return (
    <form
      className="flex items-center gap-2 mb-8"
      onSubmit={(e) => {
        e.preventDefault();
        if (path.trim()) intake.mutate(path.trim());
      }}
    >
      <FolderInput className="w-4 h-4 text-muted-foreground shrink-0" />
      <Input
        value={path}
        onChange={(e) => setPath(e.target.value)}
        placeholder="Or intake a server-readable folder path, e.g. C:/sources"
        className="font-mono text-xs"
      />
      <Button type="submit" variant="outline" disabled={!path.trim() || intake.isPending}>
        {intake.isPending ? "Importing…" : "Intake Folder"}
      </Button>
      {intake.isSuccess && (
        <span className="kicker text-green-400 whitespace-nowrap">{intake.data.length} imported</span>
      )}
      {intake.isError && <div className="min-w-0"><ErrorBox error={intake.error} /></div>}
    </form>
  );
}

function JobRow({ job, onOpenSource }: { job: Job; onOpenSource: (sourceId: string) => void }) {
  const { events, live } = useJobEvents(
    job.status === "RUNNING" || job.status === "PENDING" ? job.id : null
  );
  const failures = useFailures(job.status === "FAILED" ? job.id : undefined);
  const latest = events[events.length - 1];

  return (
    <AccordionItem value={job.id} className="border-b border-border/50">
      <AccordionTrigger className="hover:no-underline px-4 py-3">
        <div className="flex items-center gap-3 w-full pr-4">
          <StatusBadge status={live ? "RUNNING" : job.status} />
          <span className="text-xs font-mono text-muted-foreground truncate flex-1 text-left">
            {latest ? `${latest.stage} — ${latest.message}` : job.error_summary ?? job.id}
          </span>
          {live && latest && (
            <span className="text-[10px] font-mono text-primary shrink-0">{latest.percent}%</span>
          )}
          <span className="text-[10px] font-mono text-muted-foreground/60 shrink-0">{fmtDate(job.created_at)}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Button size="sm" variant="outline" onClick={() => onOpenSource(job.source_id)}>
              Open source in Review
            </Button>
            <span className="text-[10px] font-mono text-muted-foreground">job {job.id}</span>
          </div>
          {events.length > 0 && (
            <div className="bg-black/40 border border-border/50 rounded-md p-3 max-h-48 overflow-y-auto scrollbar-thin">
              {events.map((ev, i) => (
                <div key={i} className="text-[11px] font-mono text-muted-foreground">
                  <span className="text-primary/70">[{ev.stage}]</span> {ev.message}
                  <span className="opacity-50"> {ev.percent}%</span>
                </div>
              ))}
            </div>
          )}
          {job.status === "FAILED" && (
            failures.isLoading ? <Loading /> :
            failures.data && failures.data.length === 0 ? (
              <p className="text-xs text-muted-foreground font-serif">No failure receipts recorded.</p>
            ) : (
              <div className="space-y-2">
                {failures.data?.map((f) => (
                  <div key={f.id} className="rounded-md border border-red-500/40 bg-red-500/5 p-3">
                    <p className="text-xs font-mono text-red-400 mb-1">{f.error_class}</p>
                    <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap">
                      {JSON.stringify(f.detail, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export default function Intake() {
  const sources = useSources();
  const jobs = useJobs();
  const createJob = useCreateJob();
  const [, navigate] = useLocation();

  const openSource = (sourceId: string) => navigate(`/review/${sourceId}`);

  return (
    <div>
      <PageHeader kicker="Intake" title="Sources & Pipeline" />

      <UploadZone />
      <FolderIntake />

      <h2 className="font-display text-lg font-bold text-foreground mb-3">Sources</h2>
      {sources.isLoading && <Loading />}
      {sources.isError && <ErrorBox error={sources.error} />}
      {sources.data && sources.data.length === 0 && (
        <EmptyState title="No sources yet" hint="Upload a markdown document above to begin the intake queue." />
      )}
      {sources.data && sources.data.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Filename</TableHead>
              <TableHead>SHA-256</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Imported</TableHead>
              <TableHead className="text-right">Pipeline</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sources.data.map((s: Source) => (
              <TableRow key={s.id} className="cursor-pointer" onClick={() => openSource(s.id)}>
                <TableCell className="font-serif text-sm">{s.original_filename}</TableCell>
                <TableCell className="font-mono text-[10px] text-muted-foreground">{shortSha(s.sha256)}</TableCell>
                <TableCell className="kicker text-muted-foreground">{s.source_type}</TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">{fmtDate(s.created_at)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      createJob.mutate(s.id);
                    }}
                    disabled={createJob.isPending}
                  >
                    <Play className="w-3 h-3" /> Run pipeline
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {createJob.isError && <div className="mt-3"><ErrorBox error={createJob.error} /></div>}
      {createJob.isSuccess && (
        <p className="kicker text-green-400 mt-3">Pipeline started — {createJob.data.id}</p>
      )}

      <h2 className="font-display text-lg font-bold text-foreground mb-3 mt-10">Jobs</h2>
      {jobs.isLoading && <Loading />}
      {jobs.isError && <ErrorBox error={jobs.error} />}
      {jobs.data && jobs.data.length === 0 && (
        <EmptyState title="No jobs yet" hint="Run the pipeline on a source above; progress streams live over SSE." />
      )}
      {jobs.data && jobs.data.length > 0 && (
        <Accordion type="multiple" className="border border-border/50 rounded-md">
          {jobs.data.map((j) => (
            <JobRow key={j.id} job={j} onOpenSource={openSource} />
          ))}
        </Accordion>
      )}
    </div>
  );
}
