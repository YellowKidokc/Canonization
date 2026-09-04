import { useEffect, useState } from "react";
import { Plus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { CanonBadge } from "@/components/canon-badge";
import { RulingDialog } from "@/components/ruling-dialog";
import { PageHeader, Loading, ErrorBox, EmptyState, fmtDate } from "@/components/common";
import { useDiscovery, useVocab, useCreateCommons } from "@/lib/hooks";
import type { Commons } from "@/lib/types";

function NewCommonsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const vocab = useVocab();
  const create = useCreateCommons();
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [reason, setReason] = useState("");
  const [eligibility, setEligibility] = useState("");

  useEffect(() => {
    if (open && vocab.data) {
      setContent(""); setTags(""); setReason("");
      setEligibility("UNKNOWN");
      create.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, vocab.data]);

  const submit = () => {
    create.mutate(
      {
        content,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        unclassified_reason: reason,
        promotion_eligibility: eligibility,
      },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">New Discovery Commons Entry</DialogTitle>
          <DialogDescription>Observations not yet classifiable into the governed ontology.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="kicker text-muted-foreground">Content</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} className="font-serif" />
          </div>
          <div>
            <Label className="kicker text-muted-foreground">Tags (comma-separated)</Label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} className="font-mono text-xs" />
          </div>
          <div>
            <Label className="kicker text-muted-foreground">Unclassified Reason</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="font-serif text-xs" />
          </div>
          <div>
            <Label className="kicker text-muted-foreground">Promotion Eligibility</Label>
            <Select value={eligibility} onValueChange={setEligibility}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {vocab.data?.PROMOTION_ELIGIBILITY.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {create.isError && <ErrorBox error={create.error} />}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!content.trim() || !reason.trim() || create.isPending}>
            {create.isPending ? "Creating…" : "Add to Commons"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Discovery() {
  const discovery = useDiscovery();
  const [newOpen, setNewOpen] = useState(false);
  const [ruling, setRuling] = useState<{ uuid: string; label: string } | null>(null);

  return (
    <div>
      <PageHeader kicker="Discovery Commons" title="Unclassified Observations">
        <Button size="sm" onClick={() => setNewOpen(true)}>
          <Plus className="w-3.5 h-3.5" /> New Entry
        </Button>
      </PageHeader>

      {discovery.isLoading && <Loading />}
      {discovery.isError && <ErrorBox error={discovery.error} />}
      {discovery.data?.length === 0 && (
        <EmptyState title="The commons is empty" hint="Log observations here that resist classification — they await human taxonomy." />
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {discovery.data?.map((c: Commons) => (
          <div key={c.id} className="border border-border/50 rounded-md p-5 hover:border-primary/40 transition-colors flex flex-col">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <CanonBadge status={c.canon_status} />
              <Badge variant="outline" className="kicker text-primary/70">{c.promotion_eligibility}</Badge>
              <span className="text-[10px] font-mono text-muted-foreground/60 ml-auto">{fmtDate(c.created_at)}</span>
            </div>
            <p className="text-sm font-serif text-foreground leading-relaxed flex-1">{c.content}</p>
            {c.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {c.tags.map((t) => (
                  <span key={String(t)} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-muted-foreground">
                    <Tag className="w-2.5 h-2.5" /> {String(t)}
                  </span>
                ))}
              </div>
            )}
            {c.unclassified_reason && (
              <p className="text-xs text-muted-foreground font-serif italic mt-3 border-t border-border/40 pt-3">
                Why unclassified: {c.unclassified_reason}
              </p>
            )}
            <div className="mt-3 text-right">
              <Button size="sm" variant="outline" className="h-7 text-xs font-mono"
                onClick={() => setRuling({ uuid: c.id, label: c.content.slice(0, 120) })}>
                Rule
              </Button>
            </div>
          </div>
        ))}
      </div>

      <NewCommonsDialog open={newOpen} onOpenChange={setNewOpen} />
      {ruling && (
        <RulingDialog
          open={!!ruling}
          onOpenChange={(o) => !o && setRuling(null)}
          objectType="DISCOVERY_COMMONS"
          objectUuid={ruling.uuid}
          objectLabel={ruling.label}
          decisions={["PROMOTE", "DEFER", "REJECT"]}
        />
      )}
    </div>
  );
}
