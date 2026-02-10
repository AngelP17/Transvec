import { useCallback, useEffect, useMemo, useRef } from 'react';
import ForceGraph2D, { type ForceGraphMethods } from 'react-force-graph-2d';
import { IconAlertTriangle, IconMaximize, IconRefresh } from '@tabler/icons-react';
import type { KnowledgeGraphData } from '../types';
import { useElementSize } from '../hooks/useElementSize';

interface SystemKnowledgeGraphVizProps {
  data: KnowledgeGraphData;
  onGenerate: () => void;
  loading?: boolean;
}

interface GraphNode {
  id: string;
  label: string;
  type: string;
  color: string;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string;
  target: string;
  label: string;
  weight: number;
}

export function SystemKnowledgeGraphViz({ data, onGenerate, loading }: SystemKnowledgeGraphVizProps) {
  const fgRef = useRef<ForceGraphMethods<GraphNode, GraphLink>>();
  const hasZoomedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useElementSize(containerRef);

  const graphData = useMemo(() => {
    const nodes: GraphNode[] = data.nodes.map((n) => ({
      id: n.data.id,
      label: n.data.label,
      type: n.data.type,
      color: n.data.color,
    }));

    const links: GraphLink[] = data.edges.map((e) => ({
      source: e.data.source,
      target: e.data.target,
      label: e.data.label,
      weight: e.data.weight,
    }));

    return { nodes, links };
  }, [data]);

  const handleAutoZoom = useCallback(() => {
    if (fgRef.current && !hasZoomedRef.current) {
      fgRef.current.zoomToFit(400);
      hasZoomedRef.current = true;
    }
  }, []);

  const handleZoomToFit = useCallback(() => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(400);
    }
  }, []);

  useEffect(() => {
    hasZoomedRef.current = false;
  }, [data]);

  const nodeCanvasObject = useCallback((node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const isMachine = node.type?.startsWith('machine_');
    const isJob = node.type?.startsWith('job_');
    const isZone = node.type === 'zone';
    const isHub = node.type === 'system_hub' || node.type === 'factory';

    let nodeRadius = 4;
    if (isHub) nodeRadius = 10;
    else if (isMachine) nodeRadius = 6;
    else if (isJob) nodeRadius = 5;
    else if (isZone) nodeRadius = 7;

    ctx.beginPath();
    ctx.arc(node.x || 0, node.y || 0, nodeRadius, 0, 2 * Math.PI);
    ctx.fillStyle = node.color;
    ctx.fill();

    if (isHub) {
      ctx.strokeStyle = '#0b1116';
      ctx.lineWidth = 3 / globalScale;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(node.x || 0, node.y || 0, nodeRadius - 3, 0, 2 * Math.PI);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1 / globalScale;
      ctx.stroke();
    } else {
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.5 / globalScale;
      ctx.stroke();
    }

    const fontSize = isHub ? 12 / globalScale : 10 / globalScale;
    ctx.font = `${isHub ? '600' : '400'} ${fontSize}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = isHub ? '#e2e8f0' : '#94a3b8';

    let label = node.label;
    if (label.length > 20 && !isMachine && !isHub) {
      label = label.substring(0, 17) + '...';
    }

    ctx.fillText(label, node.x || 0, (node.y || 0) + nodeRadius + 2);
  }, []);

  const zoneSummary = data.stats?.zone_summary || {};
  const bottlenecks = data.stats?.bottlenecks || [];

  return (
    <div className="bg-void rounded-2xl border border-border overflow-hidden shadow-2xl">
      <div className="px-5 py-3 border-b border-border bg-void-lighter/90">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs text-text-muted">
            {data.stats.node_count} nodes, {data.stats.edge_count} edges
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomToFit}
              className="p-1.5 text-text-muted hover:text-text-bright hover:bg-border rounded-lg transition-colors"
              title="Zoom to fit"
            >
              <IconMaximize className="w-4 h-4" />
            </button>
            <button
              onClick={onGenerate}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-text-bright bg-accent/20 border border-accent/40 rounded-lg hover:bg-accent/30 disabled:opacity-50 transition-colors"
            >
              <IconRefresh className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="px-5 py-2 border-b border-border/60 flex flex-wrap items-center gap-3">
        {[
          { label: 'Running', color: '#10B981' },
          { label: 'Idle', color: '#F59E0B' },
          { label: 'Down', color: '#EF4444' },
          { label: 'Maintenance', color: '#6B7280' },
          { label: 'Zone', color: '#3B82F6' },
          { label: 'Job', color: '#00F0FF' },
          { label: 'Type', color: '#8B5CF6' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-[10px] font-medium text-text-muted uppercase tracking-wide">
              {item.label}
            </span>
          </div>
        ))}
      </div>

      <div ref={containerRef} className="h-[420px] sm:h-[520px] bg-gradient-to-b from-void to-void-lighter/40">
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          nodeCanvasObject={nodeCanvasObject}
          nodePointerAreaPaint={(node: GraphNode, color: string, ctx: CanvasRenderingContext2D) => {
            ctx.beginPath();
            ctx.arc(node.x || 0, node.y || 0, 8, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
          }}
          linkColor={() => '#23303A'}
          linkWidth={(link: GraphLink) => Math.min(link.weight, 3)}
          linkDirectionalArrowLength={3}
          linkDirectionalArrowRelPos={1}
          linkLabel={(link: GraphLink) => link.label.replace(/_/g, ' ')}
          cooldownTicks={100}
          onEngineStop={handleAutoZoom}
          enableZoomInteraction
          enableNodeDrag
          width={width || undefined}
          height={height || 520}
        />
      </div>

      {Object.keys(zoneSummary).length > 0 && (
        <div className="px-5 py-3 border-t border-border">
          <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-2">Zone Utilization</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(zoneSummary).map(([zone, stats]) => {
              const typedStats = stats as { utilization?: number; running?: number; machine_count?: number };
              const utilization = typedStats.utilization || 0;
              return (
                <div key={zone} className="bg-void-lighter rounded-lg p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-text-bright">{zone}</span>
                    <span
                      className={`text-[10px] font-semibold ${
                        utilization > 0.7 ? 'text-success' : utilization > 0.4 ? 'text-warning' : 'text-critical'
                      }`}
                    >
                      {(utilization * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        utilization > 0.7 ? 'bg-success' : utilization > 0.4 ? 'bg-warning' : 'bg-critical'
                      }`}
                      style={{ width: `${utilization * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-text-muted mt-1">
                    {typedStats.running || 0}/{typedStats.machine_count || 0} active
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {bottlenecks.length > 0 && (
        <div className="px-5 py-3 border-t border-border bg-warning/10">
          <p className="text-[10px] font-medium text-warning uppercase tracking-wider mb-2 flex items-center gap-1">
            <IconAlertTriangle className="w-3 h-3" />
            Potential Bottlenecks
          </p>
          <div className="flex flex-wrap gap-2">
            {bottlenecks.slice(0, 3).map((bottleneck) => {
              const typed = bottleneck as { machine_id: string; label: string; centrality: number };
              return (
                <span
                  key={typed.machine_id}
                  className="px-2 py-1 bg-void border border-warning/30 text-warning text-[10px] font-medium rounded flex items-center gap-1"
                >
                  {typed.label}
                  <span className="text-warning">{(typed.centrality * 100).toFixed(0)}%</span>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
