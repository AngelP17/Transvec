import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchKnowledgeGraphEdges, fetchKnowledgeGraphNodes } from '../lib/supabase';
import type { KnowledgeGraphData, KnowledgeGraphEdge, KnowledgeGraphNode } from '../types';
import { mockOntologyEdges, mockOntologyNodes } from '../data/mockData';

const TYPE_COLOR_MAP: Record<string, string> = {
  waferLot: '#4C7DFF',
  shipment: '#2DD4BF',
  carrier: '#FFB000',
  route: '#8A9BA8',
  sensor: '#A855F7',
  factory: '#FF4D4F',
  machine: '#4C7DFF',
  job: '#2DD4BF',
  zone: '#FFB000',
  system_hub: '#FF4D4F',
};

function toFallbackGraph(): KnowledgeGraphData {
  const nodes: KnowledgeGraphNode[] = mockOntologyNodes.map((node) => ({
    data: {
      id: node.id,
      label: node.data.label,
      type: node.type,
      color: TYPE_COLOR_MAP[node.type] || '#8A9BA8',
    },
  }));

  const edges: KnowledgeGraphEdge[] = mockOntologyEdges.map((edge) => ({
    data: {
      source: edge.source,
      target: edge.target,
      label: edge.label || '',
      weight: 1,
    },
  }));

  return {
    nodes,
    edges,
    stats: {
      node_count: nodes.length,
      edge_count: edges.length,
    },
  };
}

function mapTypeToColor(type: string | null, color: string | null) {
  if (color && color.length > 0) return color;
  if (!type) return '#8A9BA8';
  return TYPE_COLOR_MAP[type] || '#8A9BA8';
}

export function useKnowledgeGraphData() {
  const [graph, setGraph] = useState<KnowledgeGraphData>(() => toFallbackGraph());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef(0);

  const loadGraph = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchRef.current < 3000) return;
    lastFetchRef.current = now;

    setLoading(true);
    setError(null);

    try {
      const [nodes, edges] = await Promise.all([
        fetchKnowledgeGraphNodes(),
        fetchKnowledgeGraphEdges(),
      ]);

      if (nodes.length === 0 || edges.length === 0) {
        setGraph(toFallbackGraph());
        setLoading(false);
        return;
      }

      const mappedNodes: KnowledgeGraphNode[] = nodes.map((node) => ({
        data: {
          id: node.node_id,
          label: node.label,
          type: node.node_type,
          color: mapTypeToColor(node.node_type, node.color),
          metadata: node.metadata || {},
        },
      }));

      const mappedEdges: KnowledgeGraphEdge[] = edges.map((edge) => ({
        data: {
          source: edge.source_id,
          target: edge.target_id,
          label: edge.relation,
          weight: edge.weight ?? 1,
        },
      }));

      setGraph({
        nodes: mappedNodes,
        edges: mappedEdges,
        stats: {
          node_count: mappedNodes.length,
          edge_count: mappedEdges.length,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load graph');
      setGraph(toFallbackGraph());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGraph();
  }, [loadGraph]);

  return {
    graph,
    loading,
    error,
    refresh: loadGraph,
  };
}
