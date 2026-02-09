import type { OntologyNode as OntologyNodeType } from '../types';
import { SystemKnowledgeGraphViz } from './SystemKnowledgeGraphViz';
import { useKnowledgeGraphData } from '../hooks/useKnowledgeGraphData';

interface OntologyGraphProps {
  onNodeSelect?: (node: OntologyNodeType) => void;
}

export default function OntologyGraph({ onNodeSelect }: OntologyGraphProps) {
  const { graph, loading, refresh } = useKnowledgeGraphData();
  void onNodeSelect;

  return (
    <div className="w-full h-full p-4 bg-void">
      <SystemKnowledgeGraphViz data={graph} loading={loading} onGenerate={refresh} />
    </div>
  );
}
