import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { CanonBadge } from "@/components/canon-badge";
import { RulingDialog } from "@/components/ruling-dialog";
import { PageHeader, Loading, ErrorBox, EmptyState, fmtDate } from "@/components/common";
import {
  useEvidence, useEvidenceEdges, useStatements, useVocab,
  useCreateEvidence, useCreateEdge,
} from "@/lib/hooks";
import { cn } from "@/lib/utils";
import type { Evidence, BurdenEntry, AlternativeEntry } from "@/lib/types";

type Option = string;

function VocabSelect({
  label, options, value, onChange, placeholder = "Select…",
}: {
  label: string;
  options: Option[] | undefined;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label className="kicker text-muted-foreground">{label}</Label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          {options?.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function VocabOptionalSelect({ label, options, value, onChange }: {
  label: string; options: Option[] | undefined; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label className="kicker text-muted-foreground">{label}</Label>
      <Select value={value || "—"} onValueChange={(v) => onChange(v === "—" ? "" : v)}>
        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="—">—</SelectItem>
          {options?.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

interface BurdenDraft {
  state: string;
  rationale: string;
  detail: string;
}

function NewEvidenceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const vocab = useVocab();
  const create = useCreateEvidence();

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [evidenceClass, setEvidenceClass] = useState("");
  const [sourceClass, setSourceClass] = useState("");
  const [distance, setDistance] = useState("");
  const [relationToTarget, setRelationToTarget] = useState("");
  const [uncertaintyType, setUncertaintyType] = useState("");
  const [reportedUncertainty, setReportedUncertainty] = useState("");
  const [calibrationUncertainty, setCalibrationUncertainty] = useState("");
  const [systematicError, setSystematicError] = useState("");
  const [randomError, setRandomError] = useState("");
  const [detectionLimit, setDetectionLimit] = useState("");
  const [resolution, setResolution] = useState("");
  const [missingDataRate, setMissingDataRate] = useState("");
  const [knownBias, setKnownBias] = useState("");
  const [unknownUncertainty, setUnknownUncertainty] = useState("");
  const [effectExceedsUncertainty, setEffectExceedsUncertainty] = useState("");
  const [samplingRegime, setSamplingRegime] = useState("");
  const [selectionTiming, setSelectionTiming] = useState("");
  const [hypothesisTiming, setHypothesisTiming] = useState("");
  const [replicationStatus, setReplicationStatus] = useState("");
  const [replicationRelation, setReplicationRelation] = useState("");
  const [controls, setControls] = useState<string[]>([]);
  const [alternatives, setAlternatives] = useState<AlternativeEntry[]>([]);
  const [burdens, setBurdens] = useState<Record<string, BurdenDraft>>({});

  const burdenNames = vocab.data?.BURDEN_NAMES ?? [];
  const rationaleRequired = (state: string) =>
    !!vocab.data?.BURDEN_STATES_REQUIRING_RATIONALE.includes(state);

  const setBurden = (name: string, patch: Partial<BurdenDraft>) =>
    setBurdens((prev) => {
      const cur: BurdenDraft = prev[name] ?? { state: "", rationale: "", detail: "" };
      return { ...prev, [name]: { ...cur, ...patch } };
    });

  useEffect(() => {
    if (open && vocab.data) {
      setTitle(""); setSummary("");
      setEvidenceClass(vocab.data.EVIDENCE_CLASSES[0] ?? "");
      setSourceClass(vocab.data.EPISTEMIC_SOURCE_CLASSES[0] ?? "");
      setDistance(""); setRelationToTarget(""); setUncertaintyType("");
      setReportedUncertainty(""); setCalibrationUncertainty(""); setSystematicError("");
      setRandomError(""); setDetectionLimit(""); setResolution(""); setMissingDataRate("");
      setKnownBias(""); setUnknownUncertainty(""); setEffectExceedsUncertainty("");
      setSamplingRegime(""); setSelectionTiming(""); setHypothesisTiming("");
      setReplicationStatus(""); setReplicationRelation("");
      setControls([]); setAlternatives([]);
      setBurdens({});
      create.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, vocab.data]);

  const nineBurden: Record<string, BurdenEntry> = {};
  for (const name of burdenNames) {
    const b = burdens[name];
    if (b && b.state) {
      nineBurden[name] = {
        state: b.state,
        rationale: b.rationale || null,
        detail: b.detail ? { note: b.detail } : {},
      };
    }
  }

  const valid = title.trim() && evidenceClass && sourceClass;

  const submit = () => {
    create.mutate(
      {
        title: title.trim(),
        evidence_class: evidenceClass,
        epistemic_source_class: sourceClass,
        summary: summary || null,
        distance: distance || null,
        relation_to_target: relationToTarget || null,
        uncertainty_type: uncertaintyType || null,
        reported_uncertainty: reportedUncertainty || null,
        calibration_uncertainty: calibrationUncertainty || null,
        systematic_error: systematicError || null,
        random_error: randomError || null,
        detection_limit: detectionLimit || null,
        resolution: resolution || null,
        missing_data_rate: missingDataRate || null,
        known_bias: knownBias || null,
        unknown_uncertainty: unknownUncertainty || null,
        effect_exceeds_uncertainty: effectExceedsUncertainty === "" ? null : effectExceedsUncertainty === "true",
        sampling_regime: samplingRegime || null,
        selection_timing: selectionTiming || null,
        hypothesis_timing: hypothesisTiming || null,
        replication_status: replicationStatus || null,
        replication_relation: replicationRelation || null,
        controls,
        alternatives: alternatives.filter((a) => a.explanation),
        nine_burden: nineBurden,
      },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display">New Evidence Atom</DialogTitle>
          <DialogDescription>
            Nine-burden evidence. Created as CANDIDATE_DRAFT — NOT ADMITTED; admission requires a ruling.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Label className="kicker text-muted-foreground">Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="font-serif" />
            </div>
            <div className="md:col-span-2">
              <Label className="kicker text-muted-foreground">Summary</Label>
              <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} className="font-serif" />
            </div>
            <VocabSelect label="Evidence Class" options={vocab.data?.EVIDENCE_CLASSES} value={evidenceClass} onChange={setEvidenceClass} />
            <VocabSelect label="Epistemic Source Class" options={vocab.data?.EPISTEMIC_SOURCE_CLASSES} value={sourceClass} onChange={setSourceClass} />
            <VocabOptionalSelect label="Distance" options={vocab.data?.EVIDENCE_DISTANCES} value={distance} onChange={setDistance} />
            <VocabOptionalSelect label="Relation to Target" options={vocab.data?.RELATIONS_TO_TARGET} value={relationToTarget} onChange={setRelationToTarget} />
          </div>

          <div>
            <h3 className="kicker text-primary/70 mb-2">Uncertainty Profile</h3>
            <div className="grid md:grid-cols-3 gap-3">
              <VocabOptionalSelect label="Uncertainty Type" options={vocab.data?.UNCERTAINTY_TYPES} value={uncertaintyType} onChange={setUncertaintyType} />
              <div>
                <Label className="kicker text-muted-foreground">Reported Uncertainty</Label>
                <Input value={reportedUncertainty} onChange={(e) => setReportedUncertainty(e.target.value)} className="font-mono text-xs" />
              </div>
              <div>
                <Label className="kicker text-muted-foreground">Calibration Uncertainty</Label>
                <Input value={calibrationUncertainty} onChange={(e) => setCalibrationUncertainty(e.target.value)} className="font-mono text-xs" />
              </div>
              <div>
                <Label className="kicker text-muted-foreground">Systematic Error</Label>
                <Input value={systematicError} onChange={(e) => setSystematicError(e.target.value)} className="font-mono text-xs" />
              </div>
              <div>
                <Label className="kicker text-muted-foreground">Random Error</Label>
                <Input value={randomError} onChange={(e) => setRandomError(e.target.value)} className="font-mono text-xs" />
              </div>
              <div>
                <Label className="kicker text-muted-foreground">Detection Limit</Label>
                <Input value={detectionLimit} onChange={(e) => setDetectionLimit(e.target.value)} className="font-mono text-xs" />
              </div>
              <div>
                <Label className="kicker text-muted-foreground">Resolution</Label>
                <Input value={resolution} onChange={(e) => setResolution(e.target.value)} className="font-mono text-xs" />
              </div>
              <div>
                <Label className="kicker text-muted-foreground">Missing Data Rate</Label>
                <Input value={missingDataRate} onChange={(e) => setMissingDataRate(e.target.value)} className="font-mono text-xs" />
              </div>
              <div>
                <Label className="kicker text-muted-foreground">Known Bias</Label>
                <Input value={knownBias} onChange={(e) => setKnownBias(e.target.value)} className="font-mono text-xs" />
              </div>
              <div>
                <Label className="kicker text-muted-foreground">Unknown Uncertainty</Label>
                <Input value={unknownUncertainty} onChange={(e) => setUnknownUncertainty(e.target.value)} className="font-mono text-xs" />
              </div>
              <VocabOptionalSelect label="Effect Exceeds Uncertainty?" options={["true", "false"]} value={effectExceedsUncertainty} onChange={setEffectExceedsUncertainty} />
            </div>
          </div>

          <div>
            <h3 className="kicker text-primary/70 mb-2">Sampling · Timing · Replication</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <VocabOptionalSelect label="Sampling Regime" options={vocab.data?.SAMPLING_REGIMES} value={samplingRegime} onChange={setSamplingRegime} />
              <VocabOptionalSelect label="Selection Timing" options={vocab.data?.TIMING_OPTIONS} value={selectionTiming} onChange={setSelectionTiming} />
              <VocabOptionalSelect label="Hypothesis Timing" options={vocab.data?.HYPOTHESIS_TIMINGS} value={hypothesisTiming} onChange={setHypothesisTiming} />
              <VocabOptionalSelect label="Replication Status" options={vocab.data?.REPLICATION_STATUSES} value={replicationStatus} onChange={setReplicationStatus} />
              <VocabOptionalSelect label="Replication Relation" options={vocab.data?.REPLICATION_RELATIONS} value={replicationRelation} onChange={setReplicationRelation} />
            </div>
          </div>

          <div>
            <h3 className="kicker text-primary/70 mb-2">Controls</h3>
            <div className="flex flex-wrap gap-3">
              {vocab.data?.CONTROL_TYPES.map((c) => (
                <label key={c} className="flex items-center gap-2 text-xs font-serif text-muted-foreground cursor-pointer">
                  <Checkbox
                    checked={controls.includes(c)}
                    onCheckedChange={(checked) =>
                      setControls((prev) => (checked ? [...prev, c] : prev.filter((x) => x !== c)))
                    }
                  />
                  {c}
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="kicker text-primary/70">Alternative Explanations</h3>
              <Button size="sm" variant="outline" onClick={() => setAlternatives((prev) => [...prev, { explanation: "", status: "UNTESTED", note: "" }])}>
                <Plus className="w-3 h-3" /> Add Row
              </Button>
            </div>
            {alternatives.length === 0 && <p className="text-xs text-muted-foreground font-serif">No alternatives considered yet.</p>}
            <div className="space-y-2">
              {alternatives.map((alt, i) => (
                <div key={i} className="grid grid-cols-[1fr_180px_1fr_32px] gap-2 items-end">
                  <div>
                    {i === 0 && <Label className="kicker text-muted-foreground">Explanation</Label>}
                    <Select value={alt.explanation || undefined} onValueChange={(v) => setAlternatives((prev) => prev.map((a, j) => (j === i ? { ...a, explanation: v } : a)))}>
                      <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        {vocab.data?.ALTERNATIVE_EXPLANATIONS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    {i === 0 && <Label className="kicker text-muted-foreground">Status</Label>}
                    <Select value={alt.status} onValueChange={(v) => setAlternatives((prev) => prev.map((a, j) => (j === i ? { ...a, status: v } : a)))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {vocab.data?.ALTERNATIVE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    {i === 0 && <Label className="kicker text-muted-foreground">Note</Label>}
                    <Input value={alt.note ?? ""} onChange={(e) => setAlternatives((prev) => prev.map((a, j) => (j === i ? { ...a, note: e.target.value } : a)))} className="font-serif text-xs" />
                  </div>
                  <Button size="sm" variant="ghost" className="h-9 px-2 text-muted-foreground" onClick={() => setAlternatives((prev) => prev.filter((_, j) => j !== i))}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="kicker text-primary/70 mb-2">Nine Burdens</h3>
            <Accordion type="multiple" className="border border-border/50 rounded-md px-3">
              {burdenNames.map((name) => {
                const b = burdens[name];
                const needsRationale = b ? rationaleRequired(b.state) : false;
                const rationaleMissing = needsRationale && !(b?.rationale ?? "").trim();
                return (
                  <AccordionItem key={name} value={name}>
                    <AccordionTrigger className={cn("hover:no-underline", rationaleMissing && "text-red-400")}>
                      <span className="flex items-center gap-2">
                        {name.replace(/_/g, " ")}
                        {b?.state && (
                          <Badge variant="outline" className="kicker">{b.state}</Badge>
                        )}
                        {rationaleMissing && <span className="text-[10px] font-mono">rationale required</span>}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid md:grid-cols-2 gap-3 pb-2">
                        <div>
                          <Label className="kicker text-muted-foreground">State</Label>
                          <Select value={b?.state || "NOT_STARTED"} onValueChange={(v) => setBurden(name, { state: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {vocab.data?.BURDEN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="kicker text-muted-foreground">Detail</Label>
                          <Input value={b?.detail ?? ""} onChange={(e) => setBurden(name, { detail: e.target.value })} className="font-mono text-xs" />
                        </div>
                        <div className="md:col-span-2">
                          <Label className={cn("kicker", rationaleMissing ? "text-red-400" : "text-muted-foreground")}>
                            Rationale {needsRationale && "(required for this state)"}
                          </Label>
                          <Textarea
                            value={b?.rationale ?? ""}
                            onChange={(e) => setBurden(name, { rationale: e.target.value })}
                            rows={2}
                            className={cn("font-serif text-xs", rationaleMissing && "border-red-500/60")}
                          />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
            <p className="text-[10px] font-serif text-muted-foreground/70 mt-2">
              Every burden must be addressed — or explicitly marked inapplicable/impossible with a rationale — for the atom to count as fully opened.
            </p>
          </div>

          {create.isError && <ErrorBox error={create.error} />}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!valid || create.isPending}>
            {create.isPending ? "Creating…" : "Create Evidence Atom"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewEdgeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const vocab = useVocab();
  const evidence = useEvidence();
  const statements = useStatements();
  const create = useCreateEdge();

  const [evidenceId, setEvidenceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [bearing, setBearing] = useState("");
  const [directness, setDirectness] = useState("");
  const [expectedUnderTarget, setExpectedUnderTarget] = useState("");
  const [expectedUnderRival, setExpectedUnderRival] = useState("");
  const [strength, setStrength] = useState("");
  const [relevantRival, setRelevantRival] = useState("");
  const [discrimination, setDiscrimination] = useState("");

  useEffect(() => {
    if (open) {
      setEvidenceId(""); setTargetId(""); setBearing(""); setDirectness("");
      setExpectedUnderTarget(""); setExpectedUnderRival(""); setStrength("");
      setRelevantRival(""); setDiscrimination("");
      create.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const statementOptions = useMemo(
    () =>
      (statements.data ?? []).map((s) => ({
        value: s.id,
        label: s.exact_statement.length > 80 ? `${s.exact_statement.slice(0, 80)}…` : s.exact_statement,
      })),
    [statements.data]
  );

  const submit = () => {
    create.mutate(
      {
        evidence_id: evidenceId,
        target_statement_id: targetId,
        bearing,
        directness: directness || null,
        relevant_rival: relevantRival || null,
        expected_under_target: expectedUnderTarget || null,
        expected_under_rival: expectedUnderRival || null,
        discrimination: discrimination || null,
        strength: strength || null,
      },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">New Evidence Edge</DialogTitle>
          <DialogDescription>Bearing belongs to the typed edge, never to the evidence object. Edges start unadmitted.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <VocabSelect label="Evidence" options={(evidence.data ?? []).map((e) => e.id)} value={evidenceId} onChange={setEvidenceId} placeholder="Select evidence…" />
          <div>
            <Label className="kicker text-muted-foreground">Target Statement</Label>
            <Select value={targetId || undefined} onValueChange={setTargetId}>
              <SelectTrigger><SelectValue placeholder="Select statement…" /></SelectTrigger>
              <SelectContent>
                {statementOptions.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <VocabSelect label="Bearing" options={vocab.data?.BEARINGS} value={bearing} onChange={setBearing} />
            <VocabOptionalSelect label="Strength" options={vocab.data?.EDGE_STRENGTHS} value={strength} onChange={setStrength} />
            <VocabOptionalSelect label="Expected Under Target" options={vocab.data?.EXPECTED_UNDER_VALUES} value={expectedUnderTarget} onChange={setExpectedUnderTarget} />
            <VocabOptionalSelect label="Expected Under Rival" options={vocab.data?.EXPECTED_UNDER_VALUES} value={expectedUnderRival} onChange={setExpectedUnderRival} />
            <div>
              <Label className="kicker text-muted-foreground">Directness</Label>
              <Input value={directness} onChange={(e) => setDirectness(e.target.value)} className="font-mono text-xs" />
            </div>
            <div>
              <Label className="kicker text-muted-foreground">Relevant Rival</Label>
              <Input value={relevantRival} onChange={(e) => setRelevantRival(e.target.value)} className="font-mono text-xs" />
            </div>
            <div className="md:col-span-2">
              <Label className="kicker text-muted-foreground">Discrimination</Label>
              <Textarea value={discrimination} onChange={(e) => setDiscrimination(e.target.value)} rows={2} className="font-serif text-xs" />
            </div>
          </div>
          {create.isError && <ErrorBox error={create.error} />}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!evidenceId || !targetId || !bearing || create.isPending}>
            {create.isPending ? "Creating…" : "Create Edge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Evidence() {
  const evidence = useEvidence();
  const edges = useEvidenceEdges();
  const [newOpen, setNewOpen] = useState(false);
  const [edgeOpen, setEdgeOpen] = useState(false);
  const [ruling, setRuling] = useState<{ uuid: string; label: string } | null>(null);

  return (
    <div>
      <PageHeader kicker="Evidence" title="Evidence Atoms & Edges">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEdgeOpen(true)}>New Evidence Edge</Button>
          <Button size="sm" onClick={() => setNewOpen(true)}>
            <Plus className="w-3.5 h-3.5" /> New Evidence Atom
          </Button>
        </div>
      </PageHeader>

      {evidence.isLoading && <Loading />}
      {evidence.isError && <ErrorBox error={evidence.error} />}
      {evidence.data?.length === 0 && (
        <EmptyState title="No evidence atoms yet" hint="Create one — every burden addressed is epistemic exposure, not a claim of quality." />
      )}
      {evidence.data && evidence.data.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Source Class</TableHead>
              <TableHead>Fully Opened</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {evidence.data.map((e: Evidence) => (
              <TableRow key={e.id}>
                <TableCell className="font-serif text-sm max-w-md">
                  <span className="line-clamp-2">{e.title}</span>
                  {e.summary && <span className="block text-xs text-muted-foreground line-clamp-1">{e.summary}</span>}
                </TableCell>
                <TableCell className="kicker text-muted-foreground">{e.evidence_class}</TableCell>
                <TableCell className="kicker text-muted-foreground">{e.epistemic_source_class}</TableCell>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className={cn("kicker cursor-help", e.fully_opened ? "text-green-400 border-green-500/40" : "text-muted-foreground")}>
                        {e.fully_opened ? "OPENED" : "NOT OPENED"}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs bg-popover border border-border text-foreground font-serif normal-case tracking-normal">
                      epistemically exposed ≠ high quality
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell><CanonBadge status={e.canon_status} /></TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">{fmtDate(e.created_at)}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" className="h-7 text-xs font-mono"
                    onClick={() => setRuling({ uuid: e.id, label: e.title })}>
                    Rule
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <h2 className="font-display text-lg font-bold text-foreground mb-3 mt-10">Evidence Edges</h2>
      {edges.isLoading && <Loading />}
      {edges.isError && <ErrorBox error={edges.error} />}
      {edges.data?.length === 0 && (
        <EmptyState title="No edges yet" hint="Connect evidence atoms to statements with a typed, bearing-carrying edge." />
      )}
      {edges.data && edges.data.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Evidence</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Bearing</TableHead>
              <TableHead>Strength</TableHead>
              <TableHead>Admitted</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {edges.data.map((edge) => {
              const ev = evidence.data?.find((e) => e.id === edge.evidence_id);
              return (
                <TableRow key={edge.id}>
                  <TableCell className="font-serif text-sm max-w-xs">
                    <span className="line-clamp-1">{ev?.title ?? edge.evidence_id}</span>
                  </TableCell>
                  <TableCell className="font-mono text-[10px] text-muted-foreground">
                    {edge.target_statement_id ? `STMT ${edge.target_statement_id.slice(0, 8)}…` : edge.target_claim_id ? `CLAIM ${edge.target_claim_id.slice(0, 8)}…` : "—"}
                  </TableCell>
                  <TableCell className="kicker text-primary/80">{edge.bearing}</TableCell>
                  <TableCell className="kicker text-muted-foreground">{edge.strength ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("kicker", edge.admitted ? "text-green-400 border-green-500/40" : "text-muted-foreground")}>
                      {edge.admitted ? "ADMITTED" : "UNADMITTED"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{fmtDate(edge.created_at)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <NewEvidenceDialog open={newOpen} onOpenChange={setNewOpen} />
      <NewEdgeDialog open={edgeOpen} onOpenChange={setEdgeOpen} />
      {ruling && (
        <RulingDialog
          open={!!ruling}
          onOpenChange={(o) => !o && setRuling(null)}
          objectType="EVIDENCE"
          objectUuid={ruling.uuid}
          objectLabel={ruling.label}
          decisions={["PROMOTE", "DEFER", "REJECT"]}
        />
      )}
    </div>
  );
}
