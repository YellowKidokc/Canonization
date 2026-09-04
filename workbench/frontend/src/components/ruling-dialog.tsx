import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRuling } from "@/lib/hooks";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ObjectType, RulingDecision } from "@/lib/types";

interface RulingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectType: ObjectType;
  objectUuid: string;
  objectLabel: string;
  /** Possible decisions for this context (e.g. PROMOTE/DEFER/REJECT). */
  decisions: RulingDecision[];
}

const DECISION_STYLES: Record<RulingDecision, { label: string; active: string; hint: string }> = {
  PROMOTE: { label: "Promote", active: "border-green-500/60 bg-green-500/15 text-green-400", hint: "Move to the next governed state (candidate → under review → canonical)." },
  DEMOTE: { label: "Demote", active: "border-yellow-500/60 bg-yellow-500/15 text-yellow-400", hint: "Move the object back down the ladder." },
  DEFER: { label: "Defer", active: "border-slate-500/60 bg-slate-500/15 text-slate-400", hint: "Park the object — revisit later." },
  REJECT: { label: "Reject", active: "border-red-500/60 bg-red-500/15 text-red-400", hint: "Exclude the object from the canon." },
  SUPERSEDE: { label: "Supersede", active: "border-purple-500/60 bg-purple-500/15 text-purple-400", hint: "Replace with a corrected successor." },
  EDIT: { label: "Edit", active: "border-blue-500/60 bg-blue-500/15 text-blue-400", hint: "Record an edit ruling." },
  RESTORE: { label: "Restore", active: "border-blue-500/60 bg-blue-500/15 text-blue-400", hint: "Restore a previously excluded object." },
};

/** Human-ruling dialog — the ONLY way canon_status changes. */
export function RulingDialog({ open, onOpenChange, objectType, objectUuid, objectLabel, decisions }: RulingDialogProps) {
  const [decision, setDecision] = useState<RulingDecision>(decisions[0]);
  const [reason, setReason] = useState("");
  const ruling = useRuling();

  useEffect(() => {
    if (open) {
      setDecision(decisions[0]);
      setReason("");
      ruling.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = () => {
    ruling.mutate(
      { object_type: objectType, object_uuid: objectUuid, decision, reason: reason.trim() },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  const err = ruling.error instanceof ApiError ? ruling.error.detail : ruling.error ? String(ruling.error) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Human Ruling Required</DialogTitle>
          <DialogDescription className="font-serif text-sm">
            <span className="font-mono text-xs text-primary">{objectType}</span>
            <span className="mx-2 opacity-50">·</span>
            {objectLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {decisions.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDecision(d)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-mono uppercase tracking-widest transition-colors",
                  decision === d ? DECISION_STYLES[d].active : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {DECISION_STYLES[d].label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground font-serif">{DECISION_STYLES[decision].hint}</p>

          <Textarea
            placeholder="Reason — required. The audit trail records why."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className="font-serif"
          />

          {err && (
            <div className="rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-400 font-mono">
              {err}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!reason.trim() || ruling.isPending}>
            {ruling.isPending ? "Recording…" : "Record Ruling"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
