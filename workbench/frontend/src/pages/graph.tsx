import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  ReactFlow, Background, Controls, Handle, Position,
  type Node, type Edge, type NodeProps, type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CanonBadge } from "@/components/canon-badge";
import { PageHeader, Loading, ErrorBox, EmptyState, fmtDate } from "@/components/common";
import { useGraph, useSources } from "@/lib/hooks";
import type { GraphNode, GraphNodeData } from "@/lib/types";

/* Custom governed node: label + object type + status-colored border (data.color). */
function GovernedNode({ data, selected }: NodeProps<Node<GraphNodeData>>) {
  return (
    <div
      className="rounded-md border-2 bg-card px-3 py-2 max-w-[240px] shadow transition-shadow"
      style={{ borderColor: data.color, boxShadow: selected ? `0 0 12px ${data.color}55` : undefined }}
    >
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground !w-2 !h-2" />
      <p className="kicker mb-1" style={{ color: data.color }}>{data.object_type}</p>
      <p className="text-xs font-serif text-foreground leading-snug">{data.label}</p>
      <Handle type="source" position={Position.Right} className="!bg-muted-foreground !w-2 !h-2" />
    </div>
  );
}

const nodeTypes: NodeTypes = { governed: GovernedNode };

/** Backend returns no geometry — lay out columns by object type, stacked by index. */
function layout(nodes: GraphNode[]): Node[] {
  const order = ["SOURCE", "TRUE_STATEMENT", "CLAIM", "QUESTION", "EVIDENCE", "PREDICTION", "DISCOVERY_COMMONS"];
  const colOf = (t: string) => {
    const i = order.indexOf(t);
    return i === -1 ? order.length : i;
  };
  const counts = new Map<number, number>();
  return nodes.map((n) => {
    const col = colOf(n.data.object_type);
    const row = counts.get(col) ?? 0;
    counts.set(col, row + 1);
    return { ...n, position: { x: col * 300, y: row * 110 } };
  });
}

interface DrawerState {
  id: string;
  data: GraphNodeData;
}

export default function GraphPage() {
  const sources = useSources();
  const [sourceId, setSourceId] = useState("");
  const graph = useGraph(sourceId || undefined);
  const [selected, setSelected] = useState<DrawerState | null>(null);

  const { nodes, edges } = useMemo(() => {
    const nodes = layout(graph.data?.nodes ?? []);
    const edges: Edge[] = (graph.data?.edges ?? []).map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      labelStyle: { fill: "#a8a29e", fontSize: 9, fontFamily: "monospace" },
      style: e.type === "dashed"
        ? { stroke: "#78716c", strokeDasharray: "6 4" }
        : { stroke: "#a8a29e" },
      animated: e.type === "dashed",
    }));
    return { nodes, edges };
  }, [graph.data]);

  return (
    <div>
      <PageHeader kicker="Knowledge Graph" title="Objects & Relations" />

      <div className="flex items-center gap-2 mb-3">
        <span className="kicker text-muted-foreground">Scope</span>
        <select
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value)}
          className="bg-card border border-input rounded-md h-9 px-3 text-sm font-serif max-w-md"
        >
          <option value="">All sources</option>
          {sources.data?.map((s) => (
            <option key={s.id} value={s.id}>{s.original_filename}</option>
          ))}
        </select>
        <span className="text-[10px] font-mono text-muted-foreground/60 ml-2">solid = admitted · dashed = unadmitted</span>
      </div>

      <div className="relative border border-border/50 rounded-md overflow-hidden" style={{ height: "calc(100vh - 14rem)" }}>
        {graph.isLoading && <Loading text="Assembling the graph…" />}
        {graph.isError && <div className="p-4"><ErrorBox error={graph.error} /></div>}
        {graph.data && graph.data.nodes.length === 0 && (
          <EmptyState title="Graph is empty" hint="Extract objects from sources, then connect them with evidence edges and predictions." />
        )}
        {graph.data && graph.data.nodes.length > 0 && (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            colorMode="dark"
            onNodeClick={(_, node) => setSelected({ id: node.id, data: node.data as GraphNodeData })}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#292524" gap={24} />
            <Controls className="!bg-card !border-border" />
          </ReactFlow>
        )}

        {selected && (
          <div className="absolute top-0 right-0 bottom-0 w-80 border-l border-border bg-popover/95 backdrop-blur p-5 overflow-y-auto scrollbar-thin animate-in fade-in slide-in-from-right-8 duration-300">
            <div className="flex items-start justify-between mb-3">
              <Badge variant="outline" className="kicker text-primary border-primary/40">{selected.data.object_type}</Badge>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setSelected(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm font-serif text-foreground leading-relaxed mb-3">{selected.data.label}</p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="kicker text-muted-foreground w-20 shrink-0">Status</span>
                <CanonBadge status={selected.data.canon_status} />
              </div>
              {selected.data.statement_mode && (
                <div className="flex items-center gap-2">
                  <span className="kicker text-muted-foreground w-20 shrink-0">Mode</span>
                  <span className="font-mono">{selected.data.statement_mode}</span>
                </div>
              )}
              {selected.data.status && (
                <div className="flex items-center gap-2">
                  <span className="kicker text-muted-foreground w-20 shrink-0">Lifecycle</span>
                  <span className="font-mono">{selected.data.status}</span>
                </div>
              )}
              {selected.data.fully_opened !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="kicker text-muted-foreground w-20 shrink-0">Opened</span>
                  <span className="font-mono">{selected.data.fully_opened ? "yes" : "no"}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="kicker text-muted-foreground w-20 shrink-0">UUID</span>
                <span className="font-mono text-[10px] break-all">{selected.id}</span>
              </div>
            </div>
            <Link href={`/canon?uuid=${selected.id}`}>
              <Button size="sm" variant="outline" className="w-full mt-5 text-xs font-mono">
                Audit trail <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
            <p className="text-[10px] font-mono text-muted-foreground/50 mt-4">
              Detail panes render governed fields only; full records live in Review and the registry tables.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
