import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, qs } from "@/lib/api";
import type {
  Me, Vocab, Source, Job, JobDetail, FailureReceipt, Question, Claim, Statement,
  Evidence, EvidenceEdge, Commons, Prediction, Ruling, SearchResponse, Dashboard,
  GraphResponse, ExportReceipt, CanonVersion, AuditTrail, ObjectType, RulingDecision,
  JobEvent,
} from "@/lib/types";

/** Central query keys for consistent invalidation. */
export const qk = {
  me: ["me"] as const,
  vocab: ["vocab"] as const,
  sources: ["sources"] as const,
  jobs: ["jobs"] as const,
  failures: ["failures"] as const,
  dashboard: ["dashboard"] as const,
  statements: (f?: Record<string, string>) => ["statements", f ?? {}] as const,
  questions: (f?: Record<string, string>) => ["questions", f ?? {}] as const,
  claims: (f?: Record<string, string>) => ["claims", f ?? {}] as const,
  evidence: (f?: Record<string, string>) => ["evidence", f ?? {}] as const,
  edges: ["edges"] as const,
  discovery: ["discovery"] as const,
  predictions: ["predictions"] as const,
  rulings: (f?: Record<string, string>) => ["rulings", f ?? {}] as const,
  exports: ["exports"] as const,
  graph: (sourceId?: string) => ["graph", sourceId ?? ""] as const,
  search: (q: string) => ["search", q] as const,
};

export function useMe() {
  return useQuery({
    queryKey: qk.me,
    queryFn: () => api.get<Me>("/api/me"),
    retry: false,
    staleTime: 60_000,
  });
}

export function useVocab() {
  return useQuery({
    queryKey: qk.vocab,
    queryFn: () => api.get<Vocab>("/api/vocab"),
    staleTime: Infinity,
  });
}

export function useSources() {
  return useQuery({ queryKey: qk.sources, queryFn: () => api.get<Source[]>("/api/sources") });
}

export function useJobs() {
  return useQuery({ queryKey: qk.jobs, queryFn: () => api.get<Job[]>("/api/jobs"), refetchInterval: 5000 });
}

export function useJob(id: string | null) {
  return useQuery({
    queryKey: ["job", id],
    queryFn: () => api.get<JobDetail>(`/api/jobs/${id}`),
    enabled: !!id,
  });
}

export function useFailures(jobId?: string) {
  return useQuery({
    queryKey: jobId ? ["failures", jobId] : qk.failures,
    queryFn: () => api.get<FailureReceipt[]>(jobId ? `/api/jobs/${jobId}/failures` : "/api/failures"),
    enabled: jobId !== undefined,
  });
}

export function useDashboard() {
  return useQuery({ queryKey: qk.dashboard, queryFn: () => api.get<Dashboard>("/api/dashboard"), refetchInterval: 10_000 });
}

export function useStatements(filters?: Record<string, string>) {
  return useQuery({
    queryKey: qk.statements(filters),
    queryFn: () => api.get<Statement[]>(`/api/statements${qs(filters)}`),
  });
}

export function useQuestions(filters?: Record<string, string>) {
  return useQuery({
    queryKey: qk.questions(filters),
    queryFn: () => api.get<Question[]>(`/api/questions${qs(filters)}`),
  });
}

export function useClaims(filters?: Record<string, string>) {
  return useQuery({
    queryKey: qk.claims(filters),
    queryFn: () => api.get<Claim[]>(`/api/claims${qs(filters)}`),
  });
}

export function useEvidence(filters?: Record<string, string>) {
  return useQuery({
    queryKey: qk.evidence(filters),
    queryFn: () => api.get<Evidence[]>(`/api/evidence${qs(filters)}`),
  });
}

export function useEvidenceEdges() {
  return useQuery({ queryKey: qk.edges, queryFn: () => api.get<EvidenceEdge[]>("/api/evidence-edges") });
}

export function useDiscovery() {
  return useQuery({ queryKey: qk.discovery, queryFn: () => api.get<Commons[]>("/api/discovery") });
}

export function usePredictions() {
  return useQuery({ queryKey: qk.predictions, queryFn: () => api.get<Prediction[]>("/api/predictions") });
}

export function useRulings(filters?: Record<string, string>) {
  return useQuery({
    queryKey: qk.rulings(filters),
    queryFn: () => api.get<Ruling[]>(`/api/rulings${qs(filters)}`),
  });
}

export function useGraph(sourceId?: string) {
  return useQuery({
    queryKey: qk.graph(sourceId),
    queryFn: () => api.get<GraphResponse>(`/api/graph${qs({ source_id: sourceId })}`),
  });
}

export function useExports() {
  return useQuery({ queryKey: qk.exports, queryFn: () => api.get<ExportReceipt[]>("/api/exports") });
}

export function useCanonVersions() {
  return useQuery({
    queryKey: ["canon", "versions"],
    queryFn: () => api.get<CanonVersion[]>("/api/canon/versions"),
  });
}

export function useAuditTrail(objectUuid: string | null) {
  return useQuery({
    queryKey: ["audit", objectUuid],
    queryFn: () => api.get<AuditTrail>(`/api/audit/trail${qs({ object_uuid: objectUuid })}`),
    enabled: !!objectUuid,
  });
}

// ------------------------------------------------------------- mutations ----

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (password: string) => api.post<Me>("/api/login", { password }),
    onSuccess: (me) => {
      qc.setQueryData(qk.me, me);
      qc.invalidateQueries();
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/api/logout"),
    onSuccess: () => {
      qc.clear();
    },
  });
}

export function useUploadSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: FormData) => api.postForm<Source>("/api/sources", form),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.sources }),
  });
}

export function useIntakeFolder() {
  const qc = useQueryClient();
  return useMutation({
    // Backend contract verified live: `path` is a QUERY param, JSON body 422s.
    mutationFn: (path: string) => api.post<Source[]>(`/api/sources/folder${qs({ path })}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.sources }),
  });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sourceId: string) => api.post<Job>(`/api/jobs${qs({ source_id: sourceId })}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.jobs });
      qc.invalidateQueries({ queryKey: qk.dashboard });
    },
  });
}

export function useDeleteJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => api.delete(`/api/jobs/${jobId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.jobs });
      qc.invalidateQueries({ queryKey: qk.dashboard });
    },
  });
}

export function useRuling() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      object_type: ObjectType;
      object_uuid: string;
      decision: RulingDecision;
      reason: string;
      supporting_objects?: string[];
      reverses_ruling_id?: string;
      edit_payload?: Record<string, unknown>;
    }) => api.post<Ruling>("/api/rulings", body),
    onSuccess: () => {
      // A ruling can touch any governed object — invalidate broadly.
      qc.invalidateQueries();
    },
  });
}

export function useBulkRulings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: Array<{
      object_type: ObjectType;
      object_uuid: string;
      decision: RulingDecision;
      reason: string;
    }>) => api.post<Ruling[]>("/api/rulings/bulk", { items }),
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useCreateEvidence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post<Evidence>("/api/evidence", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.evidence() });
      qc.invalidateQueries({ queryKey: qk.dashboard });
    },
  });
}

export function useCreateEdge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post<EvidenceEdge>("/api/evidence-edges", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.edges });
      qc.invalidateQueries({ queryKey: qk.dashboard });
    },
  });
}

export function useCreateCommons() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post<Commons>("/api/discovery", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.discovery });
      qc.invalidateQueries({ queryKey: qk.dashboard });
    },
  });
}

export function useCreatePrediction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post<Prediction>("/api/predictions", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.predictions });
      qc.invalidateQueries({ queryKey: qk.dashboard });
    },
  });
}

export function useNewPredictionVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.post<Prediction>(`/api/predictions/${id}/versions`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.predictions });
      qc.invalidateQueries({ queryKey: qk.dashboard });
    },
  });
}

export function useCreateStatement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post<Statement>("/api/statements", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.statements() });
      qc.invalidateQueries({ queryKey: qk.dashboard });
    },
  });
}

export function useUpdateStatement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.patch<Statement>(`/api/statements/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.statements() }),
  });
}

export function useUpdateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.patch<Question>(`/api/questions/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.questions() }),
  });
}

export function useExport(kind: "json" | "markdown") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<ExportReceipt>(`/api/export/${kind}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.exports }),
  });
}

/** Subscribe to a job's SSE progress stream (same-origin cookies are sent). */
export function useJobEvents(jobId: string | null) {
  const [events, setEvents] = useState<JobEvent[]>([]);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    setEvents([]);
    setLive(true);
    const es = new EventSource(`/api/jobs/${jobId}/events`);
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data) as JobEvent;
        setEvents((prev) => [...prev, ev]);
        if (ev.stage === "closed") {
          es.close();
          setLive(false);
        }
      } catch {
        /* ignore malformed frame */
      }
    };
    es.onerror = () => {
      es.close();
      setLive(false);
    };
    return () => {
      es.close();
      setLive(false);
    };
  }, [jobId]);

  return { events, live };
}

export function useSearch(q: string) {
  return useQuery({
    queryKey: qk.search(q),
    queryFn: () => api.get<SearchResponse>(`/api/search${qs({ q })}`),
    enabled: q.trim().length > 0,
    placeholderData: (prev) => prev,
  });
}
