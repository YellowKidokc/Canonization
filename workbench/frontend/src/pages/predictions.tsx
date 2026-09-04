import { useEffect, useState } from "react";
import { Plus, GitBranchPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { CanonBadge } from "@/components/canon-badge";
import { RulingDialog } from "@/components/ruling-dialog";
import { PageHeader, Loading, ErrorBox, EmptyState, fmtDate } from "@/components/common";
import { usePredictions, useStatements, useCreatePrediction, useNewPredictionVersion } from "@/lib/hooks";
import type { Prediction } from "@/lib/types";

interface PredictionDraft {
  exact_prediction: string;
  parent_statement_id: string;
  expected_observation: string;
  conditions: string;
  timeframe: string;
  confirmation_condition: string;
  weakening_condition: string;
  falsification_condition: string;
}

function emptyDraft(): PredictionDraft {
  return {
    exact_prediction: "",
    parent_statement_id: "",
    expected_observation: "",
    conditions: "",
    timeframe: "",
    confirmation_condition: "",
    weakening_condition: "",
    falsification_condition: "",
  };
}

function draftFrom(p: Prediction): PredictionDraft {
  return {
    exact_prediction: p.exact_prediction,
    parent_statement_id: p.parent_statement_id ?? "",
    expected_observation: p.expected_observation ?? "",
    conditions: p.conditions ?? "",
    timeframe: p.timeframe ?? "",
    confirmation_condition: p.confirmation_condition ?? "",
    weakening_condition: p.weakening_condition ?? "",
    falsification_condition: p.falsification_condition ?? "",
  };
}

function PredictionFormDialog({
  open, onOpenChange, title, description, initial, onSubmit, pending, error,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description: string;
  initial: PredictionDraft;
  onSubmit: (d: PredictionDraft, prospective: boolean) => void;
  pending: boolean;
  error: unknown;
}) {
  const statements = useStatements();
  const [draft, setDraft] = useState<PredictionDraft>(initial);
  const [prospective, setProspective] = useState(true);
  const set = (patch: Partial<PredictionDraft>) => setDraft((d) => ({ ...d, ...patch }));

  useEffect(() => {
    if (open) {
      setDraft(initial);
      setProspective(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const valid = draft.exact_prediction.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="kicker text-muted-foreground">Exact Prediction</Label>
            <Textarea value={draft.exact_prediction} onChange={(e) => set({ exact_prediction: e.target.value })} rows={3} className="font-serif" />
          </div>
          <div>
            <Label className="kicker text-muted-foreground">Parent Statement (optional)</Label>
            <Select value={draft.parent_statement_id || "—"} onValueChange={(v) => set({ parent_statement_id: v === "—" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="—">—</SelectItem>
                {(statements.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.exact_statement.length > 70 ? `${s.exact_statement.slice(0, 70)}…` : s.exact_statement}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label className="kicker text-muted-foreground">Expected Observation</Label>
              <Textarea value={draft.expected_observation} onChange={(e) => set({ expected_observation: e.target.value })} rows={2} className="font-serif text-xs" />
            </div>
            <div>
              <Label className="kicker text-muted-foreground">Conditions</Label>
              <Textarea value={draft.conditions} onChange={(e) => set({ conditions: e.target.value })} rows={2} className="font-serif text-xs" />
            </div>
            <div>
              <Label className="kicker text-muted-foreground">Timeframe</Label>
              <Input value={draft.timeframe} onChange={(e) => set({ timeframe: e.target.value })} className="font-mono text-xs" />
            </div>
            <div>
              <Label className="kicker text-muted-foreground">Confirmation Condition</Label>
              <Input value={draft.confirmation_condition} onChange={(e) => set({ confirmation_condition: e.target.value })} className="font-serif text-xs" />
            </div>
            <div>
              <Label className="kicker text-muted-foreground">Weakening Condition</Label>
              <Input value={draft.weakening_condition} onChange={(e) => set({ weakening_condition: e.target.value })} className="font-serif text-xs" />
            </div>
            <div>
              <Label className="kicker text-muted-foreground">Falsification Condition</Label>
              <Input value={draft.falsification_condition} onChange={(e) => set({ falsification_condition: e.target.value })} className="font-serif text-xs" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs font-serif text-muted-foreground cursor-pointer">
            <Checkbox checked={prospective} onCheckedChange={(c) => setProspective(!!c)} />
            Prospective (registered before the outcome is known)
          </label>
          {error ? <ErrorBox error={error} /> : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSubmit(draft, prospective)} disabled={!valid || pending}>
            {pending ? "Recording…" : "Record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Predictions() {
  const predictions = usePredictions();
  const create = useCreatePrediction();
  const newVersion = useNewPredictionVersion();

  const [registerOpen, setRegisterOpen] = useState(false);
  const [correcting, setCorrecting] = useState<Prediction | null>(null);
  const [ruling, setRuling] = useState<{ uuid: string; label: string } | null>(null);

  const submitBody = (d: PredictionDraft, prospective: boolean, status: string) => ({
    exact_prediction: d.exact_prediction,
    parent_statement_id: d.parent_statement_id || null,
    expected_observation: d.expected_observation || null,
    conditions: d.conditions || null,
    timeframe: d.timeframe || null,
    confirmation_condition: d.confirmation_condition || null,
    weakening_condition: d.weakening_condition || null,
    falsification_condition: d.falsification_condition || null,
    prospective,
    status,
  });

  return (
    <div>
      <PageHeader kicker="Predictions" title="Prediction Registry">
        <Button size="sm" onClick={() => setRegisterOpen(true)}>
          <Plus className="w-3.5 h-3.5" /> Register Prediction
        </Button>
      </PageHeader>

      <p className="text-xs font-serif text-muted-foreground mb-4 max-w-2xl">
        Registration is immutable. Corrections create a new version — the original stays untouched,
        and <span className="font-mono text-primary/80">registered_at</span> never changes.
      </p>

      {predictions.isLoading && <Loading />}
      {predictions.isError && <ErrorBox error={predictions.error} />}
      {predictions.data?.length === 0 && (
        <EmptyState title="No predictions registered" hint="Register a falsifiable prediction before its outcome is known." />
      )}
      {predictions.data && predictions.data.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Prediction</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Prospective</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Registered At</TableHead>
              <TableHead>Canon Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {predictions.data.map((p: Prediction) => (
              <TableRow key={p.id}>
                <TableCell className="font-serif text-sm max-w-md">
                  <span className="line-clamp-2">{p.exact_prediction}</span>
                  {p.timeframe && <span className="block text-[10px] font-mono text-muted-foreground mt-0.5">{p.timeframe}</span>}
                </TableCell>
                <TableCell className="kicker text-primary/80">{p.status}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="kicker text-muted-foreground">
                    {p.prospective ? "PROSPECTIVE" : "RETROSPECTIVE"}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">v{p.version}</TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">{fmtDate(p.registered_at)}</TableCell>
                <TableCell><CanonBadge status={p.canon_status} /></TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button size="sm" variant="ghost" className="h-7 text-xs font-mono" onClick={() => setCorrecting(p)}>
                    <GitBranchPlus className="w-3.5 h-3.5 mr-1" /> Correct
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs font-mono ml-1" onClick={() => setRuling({ uuid: p.id, label: p.exact_prediction })}>
                    Rule
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <PredictionFormDialog
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        title="Register Prediction"
        description="Registered as immutable. Always lands as CANDIDATE_DRAFT — NOT ADMITTED until ruled on."
        initial={emptyDraft()}
        pending={create.isPending}
        error={create.error}
        onSubmit={(d, prospective) =>
          create.mutate(submitBody(d, prospective, "REGISTERED"), { onSuccess: () => setRegisterOpen(false) })
        }
      />

      <PredictionFormDialog
        open={!!correcting}
        onOpenChange={(o) => !o && setCorrecting(null)}
        title={`Correct Prediction → Version ${(correcting?.version ?? 0) + 1}`}
        description="Creates a NEW immutable version. The original stays untouched."
        initial={correcting ? draftFrom(correcting) : emptyDraft()}
        pending={newVersion.isPending}
        error={newVersion.error}
        onSubmit={(d, prospective) => {
          if (!correcting) return;
          newVersion.mutate(
            { id: correcting.id, body: submitBody(d, prospective, "REGISTERED") },
            { onSuccess: () => setCorrecting(null) }
          );
        }}
      />

      {ruling && (
        <RulingDialog
          open={!!ruling}
          onOpenChange={(o) => !o && setRuling(null)}
          objectType="PREDICTION"
          objectUuid={ruling.uuid}
          objectLabel={ruling.label}
          decisions={["PROMOTE", "DEFER", "REJECT", "SUPERSEDE"]}
        />
      )}
    </div>
  );
}
