import type { OntologyNode as OntologyNodeType, Shipment } from '../types';
import { SystemKnowledgeGraphViz } from './SystemKnowledgeGraphViz';
import { useKnowledgeGraphData } from '../hooks/useKnowledgeGraphData';

interface OntologyGraphProps {
  onNodeSelect?: (node: OntologyNodeType) => void;
  shipments?: Shipment[];
}

export default function OntologyGraph({ onNodeSelect, shipments }: OntologyGraphProps) {
  const { graph, loading, refresh } = useKnowledgeGraphData({ shipments });
  void onNodeSelect;

  return (
    <div className="w-full h-full p-2 sm:p-4 bg-void">
      <SystemKnowledgeGraphViz data={graph} loading={loading} onGenerate={refresh} />
    </div>
  );
}
