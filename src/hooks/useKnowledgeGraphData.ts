import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchKnowledgeGraphEdges, fetchKnowledgeGraphNodes } from '../lib/supabase';
import type { Carrier, KnowledgeGraphData, KnowledgeGraphEdge, KnowledgeGraphNode, Sensor, Shipment } from '../types';
import { mockOntologyEdges, mockOntologyNodes, mockShipments, mockCarriers, mockSensors } from '../data/mockData';

const TYPE_COLOR_MAP: Record<string, string> = {
  waferLot: '#d1d5db',
  shipment: '#38bdf8',
  carrier: '#f59e0b',
  route: '#94a3b8',
  sensor: '#a855f7',
  factory: '#f87171',
  customer: '#22c55e',
  machine: '#4C7DFF',
  job: '#2DD4BF',
  zone: '#FFB000',
  system_hub: '#FF4D4F',
};

function toFallbackGraph(options?: { shipments?: Shipment[]; carriers?: Carrier[]; sensors?: Sensor[] }): KnowledgeGraphData {
  const fallbackShipments = options?.shipments && options.shipments.length > 0 ? options.shipments : mockShipments;
  const fallbackCarriers = options?.carriers && options.carriers.length > 0 ? options.carriers : mockCarriers;
  const fallbackSensors = options?.sensors && options.sensors.length > 0 ? options.sensors : mockSensors;

  if (fallbackShipments.length > 0) {
    const nodes: KnowledgeGraphNode[] = [];
    const edges: KnowledgeGraphEdge[] = [];
    const nodeIds = new Set<string>();

    const pushNode = (id: string, label: string, type: string) => {
      if (nodeIds.has(id)) return;
      nodeIds.add(id);
      nodes.push({
        data: {
          id,
          label,
          type,
          color: TYPE_COLOR_MAP[type] || '#8A9BA8',
        },
      });
    };

    const carrierMap = new Map(fallbackCarriers.map((carrier) => [carrier.id, carrier]));
    const sensorMap = new Map(fallbackSensors.map((sensor) => [sensor.sensorId, sensor]));

    fallbackShipments.forEach((shipment) => {
      const shipmentId = `shipment-${shipment.id}`;
      pushNode(shipmentId, shipment.trackingCode, 'shipment');

      const originId = `factory-${shipment.origin.id}`;
      pushNode(originId, shipment.origin.name, 'factory');
      edges.push({ data: { source: originId, target: shipmentId, label: 'ORIGINATES', weight: 1 } });

      const destinationId = `customer-${shipment.destination.id}`;
      pushNode(destinationId, shipment.destination.name, 'customer');
      edges.push({ data: { source: shipmentId, target: destinationId, label: 'DELIVERED_TO', weight: 1 } });

      const carrier = carrierMap.get(shipment.carrierId);
      if (carrier) {
        const carrierId = `carrier-${carrier.id}`;
        pushNode(carrierId, carrier.name, 'carrier');
        edges.push({ data: { source: shipmentId, target: carrierId, label: 'CARRIED_BY', weight: 1 } });
      }

      if (shipment.routeId) {
        const routeId = `route-${shipment.routeId}`;
        pushNode(routeId, shipment.routeId.toUpperCase(), 'route');
        edges.push({ data: { source: shipmentId, target: routeId, label: 'FOLLOWS', weight: 1 } });
      }

      shipment.waferLotIds.forEach((lotId) => {
        const lotNodeId = `wafer-${lotId}`;
        pushNode(lotNodeId, lotId, 'waferLot');
        edges.push({ data: { source: lotNodeId, target: shipmentId, label: 'PART_OF', weight: 1 } });
      });

      shipment.sensorIds.forEach((sensorId) => {
        const sensor = sensorMap.get(sensorId);
        const label = sensor ? sensor.sensorId : sensorId;
        const sensorNodeId = `sensor-${label}`;
        pushNode(sensorNodeId, label, 'sensor');
        edges.push({ data: { source: shipmentId, target: sensorNodeId, label: 'MONITORED_BY', weight: 1 } });
      });
    });

    return {
      nodes,
      edges,
      stats: {
        node_count: nodes.length,
        edge_count: edges.length,
      },
    };
  }

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

export function useKnowledgeGraphData(options?: { shipments?: Shipment[]; carriers?: Carrier[]; sensors?: Sensor[] }) {
  const fallbackGraph = useMemo(() => toFallbackGraph(options), [options?.shipments, options?.carriers, options?.sensors]);
  const [graph, setGraph] = useState<KnowledgeGraphData>(() => fallbackGraph);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(true);
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
        setGraph(fallbackGraph);
        setUsingFallback(true);
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
      setUsingFallback(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load graph');
      setGraph(fallbackGraph);
      setUsingFallback(true);
    } finally {
      setLoading(false);
    }
  }, [fallbackGraph]);

  useEffect(() => {
    void loadGraph();
  }, [loadGraph]);

  useEffect(() => {
    if (usingFallback) {
      setGraph(fallbackGraph);
    }
  }, [fallbackGraph, usingFallback]);

  return {
    graph,
    loading,
    error,
    refresh: loadGraph,
  };
}
