import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { ArrowRight, Gavel, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { CanonBadge } from "@/components/canon-badge";
import { RulingDialog } from "@/components/ruling-dialog";
import { PageHeader, Loading, ErrorBox, EmptyState, fmtDate } from "@/components/common";
import {
  useSources, useQuestions, useClaims, useStatements, useVocab,
  useUpdateStatement, useUpdateQuestion, useCreateStatement,
} from "@/lib/hooks";
import { api } from "@/lib/api";
import type { Question, Claim, Statement, ObjectType, RulingDecision, SourceAnchor } from "@/lib/types";

function useSourceContent(sourceId: string | undefined) {
  return useQuery({
    queryKey: ["source-content", sourceId],
    queryFn: () => api.get<string>(`/api/sources/${sourceId}/content`),
    enabled: !!sourceId,
  });
}

interface RulingTarget {
  objectType: ObjectType;
  objectUuid: string;
  label: string;
  decisions: RulingDecision[];
}

function AnchorQuote({ anchor }: { anchor: SourceAnchor | null }) {
  if (!anchor) return null;
  return (
    <blockquote className="border-l-2 border-primary/40 bg-white/5 px-3 py-2 my-2 rounded-r-sm">
      <p className="text-xs font-serif italic text-muted-foreground">“{anchor.exact_quote}”</p>
      {anchor.start_line != null && (
        <p className="text-[10px] font-mono text-muted-foreground/60 mt-1">lines {anchor.start_line}–{anchor.end_line ?? anchor.start_line}</p>
      )}
    </blockquote>
  );
}

function StatementEditDialog({
  statement, open, onOpenChange,
}: { statement: Statement | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const vocab = useVocab();
  const update = useUpdateStatement();
  const [exact, setExact] = useState("");
  const [plain, setPlain] = useState("");
  const [mode, setMode] = useState("");
  const [scope, setScope] = useState("");

  useEffect(() => {
    if (open && statement) {
      setExact(statement.exact_statement);
      setPlain(statement.plain_meaning ?? "");
      setMode(statement.statement_mode);
      setScope(statement.scope ?? "");
      update.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = () => {
    if (!statement) return;
    update.mutate(
      { id: statement.id, body: { exact_statement: exact, plain_meaning: plain || null, statement_mode: mode, scope: scope || null } },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Edit Candidate Statement</DialogTitle>
          <DialogDescription>Editing never changes canon_status — rulings do that.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="kicker text-muted-foreground">Exact Statement</Label>
            <Textarea value={exact} onChange={(e) => setExact(e.target.value)} rows={3} className="font-serif" />
          </div>
          <div>
            <Label className="kicker text-muted-foreground">Plain Meaning</Label>
            <Textarea value={plain} onChange={(e) => setPlain(e.target.value)} rows={2} className="font-serif" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="kicker text-muted-foreground">Mode</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {vocab.data?.STATEMENT_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="kicker text-muted-foreground">Scope</Label>
              <Input value={scope} onChange={(e) => setScope(e.target.value)} className="font-serif" />
            </div>
          </div>
          {update.isError && <ErrorBox error={update.error} />}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={update.isPending || !exact.trim()}>
            {update.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QuestionEditDialog({
  question, open, onOpenChange,
}: { question: Question | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const vocab = useVocab();
  const update = useUpdateQuestion();
  const [exact, setExact] = useState("");
  const [qtype, setQtype] = useState("");
  const [importance, setImportance] = useState("");
  const [answerStatus, setAnswerStatus] = useState("");

  useEffect(() => {
    if (open && question) {
      setExact(question.exact_question);
      setQtype(question.question_type);
      setImportance(question.importance);
      setAnswerStatus(question.answer_status);
      update.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = () => {
    if (!question) return;
    update.mutate(
      { id: question.id, body: { exact_question: exact, question_type: qtype, importance, answer_status: answerStatus } },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Edit Candidate Question</DialogTitle>
          <DialogDescription>Editing never changes canon_status — rulings do that.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="kicker text-muted-foreground">Exact Question</Label>
            <Textarea value={exact} onChange={(e) => setExact(e.target.value)} rows={3} className="font-serif" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="kicker text-muted-foreground">Type</Label>
              <Select value={qtype} onValueChange={setQtype}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {vocab.data?.QUESTION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="kicker text-muted-foreground">Importance</Label>
              <Select value={importance} onValueChange={setImportance}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {vocab.data?.IMPORTANCE_LEVELS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="kicker text-muted-foreground">Answer Status</Label>
              <Select value={answerStatus} onValueChange={setAnswerStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {vocab.data?.ANSWER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {update.isError && <ErrorBox error={update.error} />}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={update.isPending || !exact.trim()}>
            {update.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewStatementDialog({ sourceId, open, onOpenChange }: { sourceId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const vocab = useVocab();
  const create = useCreateStatement();
  const [exact, setExact] = useState("");
  const [plain, setPlain] = useState("");
  const [mode, setMode] = useState("");
  const [quote, setQuote] = useState("");

  useEffect(() => {
    if (open) {
      setExact(""); setPlain(""); setQuote("");
      setMode(vocab.data?.STATEMENT_MODES[0] ?? "");
      create.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = () => {
    create.mutate(
      {
        exact_statement: exact,
        plain_meaning: plain || null,
        statement_mode: mode,
        source_id: sourceId,
        source_anchor: quote.trim() ? { exact_quote: quote.trim() } : null,
      },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">New Candidate Statement</DialogTitle>
          <DialogDescription>Manual entry always lands as CANDIDATE_DRAFT — NOT ADMITTED.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="kicker text-muted-foreground">Exact Statement</Label>
            <Textarea value={exact} onChange={(e) => setExact(e.target.value)} rows={3} className="font-serif" />
          </div>
          <div>
            <Label className="kicker text-muted-foreground">Plain Meaning</Label>
            <Textarea value={plain} onChange={(e) => setPlain(e.target.value)} rows={2} className="font-serif" />
          </div>
          <div>
            <Label className="kicker text-muted-foreground">Mode (from controlled vocab)</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {vocab.data?.STATEMENT_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="kicker text-muted-foreground">Anchor Quote (optional)</Label>
            <Textarea value={quote} onChange={(e) => setQuote(e.target.value)} rows={2} className="font-serif" />
          </div>
          {create.isError && <ErrorBox error={create.error} />}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={create.isPending || !exact.trim() || !mode}>
            {create.isPending ? "Creating…" : "Create Candidate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Review() {
  const [, params] = useRoute("/review/:sourceId?");
  const sourceId = params?.sourceId;
  const [, navigate] = useLocation();

  const sources = useSources();
  const content = useSourceContent(sourceId);
  const questions = useQuestions(sourceId ? { source_id: sourceId } : undefined);
  const claims = useClaims(sourceId ? { source_id: sourceId } : undefined);
  const statements = useStatements(sourceId ? { source_id: sourceId } : undefined);

  const [ruling, setRuling] = useState<RulingTarget | null>(null);
  const [editStatement, setEditStatement] = useState<Statement | null>(null);
  const [editQuestion, setEditQuestion] = useState<Question | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const selected: string | undefined = sourceId ?? sources.data?.[0]?.id;

  return (
    <div>
      <PageHeader kicker="Review" title="Source Review">
        {selected && (
          <Button variant="outline" size="sm" onClick={() => setNewOpen(true)}>
            <Plus className="w-3.5 h-3.5" /> New Candidate Statement
          </Button>
        )}
      </PageHeader>

      <div className="rounded-md border border-yellow-500/40 bg-yellow-500/5 px-4 py-2.5 mb-4 text-xs font-serif text-yellow-200/90">
        All extracted objects are <span className="font-mono">CANDIDATE_DRAFT — NOT ADMITTED</span> until a human ruling admits them.
        Status changes happen only through recorded rulings with a stated reason.
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className="kicker text-muted-foreground shrink-0">Source</span>
        <Select
          value={selected ?? ""}
          onValueChange={(v) => navigate(`/review/${v}`)}
        >
          <SelectTrigger className="max-w-md"><SelectValue placeholder="Select a source…" /></SelectTrigger>
          <SelectContent>
            {sources.data?.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.original_filename}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selected ? (
        <EmptyState title="No source selected" hint="Import sources via Intake, then choose one here." />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6" style={{ height: "calc(100vh - 15rem)" }}>
          {/* Left: source document */}
          <div className="border border-border/50 rounded-md flex flex-col overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border/50 flex items-center justify-between">
              <span className="kicker text-primary/70">Preserved Source</span>
              <span className="text-[10px] font-mono text-muted-foreground/60">{sources.data?.find((s) => s.id === selected)?.original_filename}</span>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-6 prose prose-invert prose-sm max-w-none
                prose-headings:font-display prose-headings:font-bold
                prose-h2:text-primary/90 prose-h2:text-xl
                prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:font-serif
                prose-strong:text-white
                prose-blockquote:border-l-primary/50 prose-blockquote:bg-white/5 prose-blockquote:px-4 prose-blockquote:italic
                prose-ul:list-disc prose-ul:pl-6 prose-li:marker:text-primary/50
                prose-code:bg-black/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-primary/80 prose-code:font-mono
                prose-a:text-primary hover:prose-a:text-primary/80">
                {content.isLoading && <Loading text="Reading source…" />}
                {content.isError && <ErrorBox error={content.error} />}
                {content.data && <ReactMarkdown>{content.data}</ReactMarkdown>}
              </div>
            </ScrollArea>
          </div>

          {/* Right: candidate tabs */}
          <div className="border border-border/50 rounded-md flex flex-col overflow-hidden">
            <div className="px-4 pt-3 border-b border-border/50">
              <Tabs defaultValue="questions" className="w-full">
                <TabsList className="bg-transparent p-0 gap-1 h-auto">
                  <TabsTrigger value="questions" className="kicker data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-none">
                    Questions ({questions.data?.length ?? 0})
                  </TabsTrigger>
                  <TabsTrigger value="claims" className="kicker data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-none">
                    Claims ({claims.data?.length ?? 0})
                  </TabsTrigger>
                  <TabsTrigger value="statements" className="kicker data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-none">
                    True Statements ({statements.data?.length ?? 0})
                  </TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1" style={{ height: "calc(100vh - 20rem)" }}>
                  <div className="p-4 space-y-3">
                    <TabsContent value="questions" className="m-0 space-y-3 mt-0">
                      {questions.isLoading && <Loading />}
                      {questions.isError && <ErrorBox error={questions.error} />}
                      {questions.data?.length === 0 && (
                        <EmptyState title="No questions extracted" hint="Run the pipeline on this source to extract candidate questions." />
                      )}
                      {questions.data?.map((q: Question) => (
                        <div key={q.id} className="border border-border/50 rounded-md p-4 hover:border-primary/30 transition-colors">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <CanonBadge status={q.canon_status} />
                              <Badge variant="outline" className="kicker">{q.question_type}</Badge>
                              <Badge variant="outline" className="kicker text-muted-foreground">{q.answer_status}</Badge>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground" onClick={() => setEditQuestion(q)}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs font-mono"
                                onClick={() => setRuling({ objectType: "QUESTION", objectUuid: q.id, label: q.exact_question, decisions: ["PROMOTE", "DEFER", "REJECT"] })}>
                                <Gavel className="w-3.5 h-3.5 mr-1" /> Rule
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm font-serif text-foreground leading-relaxed">{q.exact_question}</p>
                          <AnchorQuote anchor={q.source_anchor} />
                          {q.why_pressure && <p className="text-xs text-muted-foreground mt-1 font-serif">Why it presses: {q.why_pressure}</p>}
                        </div>
                      ))}
                    </TabsContent>

                    <TabsContent value="claims" className="m-0 space-y-3 mt-0">
                      {claims.isLoading && <Loading />}
                      {claims.isError && <ErrorBox error={claims.error} />}
                      {claims.data?.length === 0 && (
                        <EmptyState title="No claims extracted" hint="Run the pipeline on this source to extract candidate claims." />
                      )}
                      {claims.data?.map((c: Claim) => (
                        <div key={c.id} className="border border-border/50 rounded-md p-4 hover:border-primary/30 transition-colors">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <CanonBadge status={c.canon_status} />
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs font-mono"
                              onClick={() => setRuling({ objectType: "CLAIM", objectUuid: c.id, label: c.exact_claim, decisions: ["PROMOTE", "DEFER", "REJECT"] })}>
                              <Gavel className="w-3.5 h-3.5 mr-1" /> Rule
                            </Button>
                          </div>
                          <p className="text-sm font-serif text-foreground leading-relaxed">{c.exact_claim}</p>
                          {c.plain_language && <p className="text-xs text-muted-foreground mt-1 font-serif">{c.plain_language}</p>}
                          <AnchorQuote anchor={c.source_anchor} />
                        </div>
                      ))}
                    </TabsContent>

                    <TabsContent value="statements" className="m-0 space-y-3 mt-0">
                      {statements.isLoading && <Loading />}
                      {statements.isError && <ErrorBox error={statements.error} />}
                      {statements.data?.length === 0 && (
                        <EmptyState title="No true statements yet" hint="Run the pipeline or add a candidate statement manually." />
                      )}
                      {statements.data?.map((s: Statement) => (
                        <div key={s.id} className="border border-border/50 rounded-md p-4 hover:border-primary/30 transition-colors">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <CanonBadge status={s.canon_status} />
                              <Badge variant="outline" className="kicker">{s.statement_mode}</Badge>
                              {s.contradiction_status !== "NONE_KNOWN" && (
                                <Badge variant="outline" className="kicker text-red-400 border-red-500/40">{s.contradiction_status}</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground" onClick={() => setEditStatement(s)}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs font-mono"
                                onClick={() => setRuling({ objectType: "TRUE_STATEMENT", objectUuid: s.id, label: s.exact_statement, decisions: ["PROMOTE", "DEFER", "REJECT"] })}>
                                <Gavel className="w-3.5 h-3.5 mr-1" /> Rule
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm font-serif text-foreground leading-relaxed">{s.exact_statement}</p>
                          {s.plain_meaning && <p className="text-xs text-muted-foreground mt-1 font-serif">{s.plain_meaning}</p>}
                          <AnchorQuote anchor={s.source_anchor} />
                        </div>
                      ))}
                    </TabsContent>
                  </div>
                </ScrollArea>
              </Tabs>
            </div>
            <div className="flex-1 flex items-center justify-center text-muted-foreground/40">
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {ruling && (
        <RulingDialog
          open={!!ruling}
          onOpenChange={(o) => !o && setRuling(null)}
          objectType={ruling.objectType}
          objectUuid={ruling.objectUuid}
          objectLabel={ruling.label}
          decisions={ruling.decisions}
        />
      )}
      <StatementEditDialog statement={editStatement} open={!!editStatement} onOpenChange={(o) => !o && setEditStatement(null)} />
      <QuestionEditDialog question={editQuestion} open={!!editQuestion} onOpenChange={(o) => !o && setEditQuestion(null)} />
      {selected && <NewStatementDialog sourceId={selected} open={newOpen} onOpenChange={setNewOpen} />}
    </div>
  );
}
