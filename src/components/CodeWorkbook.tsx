import { useState } from 'react';
import { mockNotebookCells } from '../data/mockData';
import type { NotebookCell, Shipment } from '../types';

interface CodeWorkbookProps {
  onClose: () => void;
  selectedShipment: Shipment | null;
}

export default function CodeWorkbook({ onClose, selectedShipment }: CodeWorkbookProps) {
  const [cells, setCells] = useState<NotebookCell[]>(mockNotebookCells);
  const [runningCell, setRunningCell] = useState<string | null>(null);
  const [saved, setSaved] = useState(true);

  const runCell = async (cellId: string) => {
    setRunningCell(cellId);
    // Simulate execution delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    setRunningCell(null);
  };

  return (
    <div className="w-full sm:w-[600px] max-w-full border-t sm:border-t-0 sm:border-l border-border bg-void flex flex-col shadow-2xl z-20 self-stretch sm:self-end">
      {/* Notebook Header */}
      <div className="min-h-12 border-b border-border bg-void-light flex items-center justify-between px-3 sm:px-4 py-2 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
            <polyline points="4 17 10 11 4 5"/>
            <line x1="12" x2="20" y1="19" y2="19"/>
          </svg>
          <span className="font-bold text-xs sm:text-sm tracking-wide text-text-bright truncate">
            Analysis: {selectedShipment ? `${selectedShipment.trackingCode}_Anomaly` : 'Global_Logistics'}.ipynb
          </span>
          <span className="hidden sm:inline text-[10px] bg-border px-1.5 py-0.5 rounded text-text-muted">PYTHON 3.9</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              setSaved(true);
              setTimeout(() => setSaved(false), 2000);
            }}
            className={`p-1.5 hover:bg-border rounded transition-colors ${saved ? 'text-success' : 'text-text-muted hover:text-text-bright'}`}
            title={saved ? 'Saved!' : 'Save'}
          >
            {saved ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
            )}
          </button>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-border rounded text-text-muted hover:text-text-bright transition-colors"
            title="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
              <path d="M9 3v18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Notebook Content */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-5 sm:space-y-6">
        {cells.map((cell) => (
          <div key={cell.id} className="group">
            {cell.type === 'MARKDOWN' ? (
              /* Markdown Cell */
              <div className="prose prose-invert prose-sm max-w-none text-text-bright">
                <div className="text-text-bright whitespace-pre-wrap">{cell.content}</div>
              </div>
            ) : (
              /* Code Cell */
              <div className="border border-border rounded-md overflow-hidden bg-code-bg group focus-within:border-accent transition-colors">
                {/* Cell Toolbar */}
                <div className="bg-void-lighter px-2 py-1 flex items-center justify-between border-b border-border">
                  <span className="text-[10px] font-mono text-text-muted">[ ]</span>
                  <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => runCell(cell.id)}
                      disabled={runningCell === cell.id}
                      className="flex items-center gap-1 px-2 py-0.5 bg-accent text-white rounded text-[10px] font-bold hover:bg-accent-hover disabled:opacity-50"
                    >
                      {runningCell === cell.id ? (
                        <>
                          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                          </svg>
                          RUNNING...
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3"/>
                          </svg>
                          RUN
                        </>
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Code Editor Area */}
                <div className="p-3 font-mono text-sm leading-relaxed relative code-editor">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-focus-within:bg-accent transition-colors" />
                  <CodeHighlighter code={cell.content} />
                </div>

                {/* Output Area */}
                {cell.output && (
                  <div className="border-t border-border bg-void-light p-3 font-mono text-xs">
                    <div className="text-success whitespace-pre-wrap">{cell.output}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* New Cell Placeholder */}
        <button 
          onClick={() => {
            const newCell: NotebookCell = {
              id: `cell-${Date.now()}`,
              type: 'CODE',
              content: '# New analysis cell\nprint("Enter your analysis code here")',
            };
            setCells(prev => [...prev, newCell]);
          }}
          className="w-full h-8 border-2 border-dashed border-border rounded flex items-center justify-center text-text-muted text-xs hover:border-text-muted hover:text-text-bright transition-colors"
        >
          + Code
        </button>
      </div>

      {/* Status Footer */}
      <div className="h-8 border-t border-border bg-void-light flex items-center px-4 justify-between text-[10px] text-text-muted">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          <span>KERNEL: IDLE</span>
        </div>
        <span>RAM: 240MB / 4GB</span>
      </div>
    </div>
  );
}

// Simple syntax highlighter
function CodeHighlighter({ code }: { code: string }) {
  const lines = code.split('\n');
  
  return (
    <div>
      {lines.map((line, i) => (
        <div key={i} className="whitespace-pre">
          {highlightLine(line)}
        </div>
      ))}
    </div>
  );
}

function highlightLine(line: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  let remaining = line;
  
  // Keywords (defined inline in patterns)
  const patterns = [
    { regex: /^(\s*)(#.*)$/, className: 'text-code-comment' }, // Comments
    { regex: /^(\s*)(import|from|as|def|class|return|if|else|for|in)\b/, className: 'text-code-keyword' },
    { regex: /(['"`])(?:(?=(\\?))\2[\s\S])*?\1/, className: 'text-code-string' }, // Strings
    { regex: /\b\d+\.?\d*\b/, className: 'text-code-number' }, // Numbers
    { regex: /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/, className: 'text-code-function' }, // Function calls
  ];
  
  let key = 0;
  
  while (remaining.length > 0) {
    let matched = false;
    
    for (const pattern of patterns) {
      const match = remaining.match(pattern.regex);
      if (match && match.index === 0) {
        tokens.push(
          <span key={key++} className={pattern.className}>
            {match[0]}
          </span>
        );
        remaining = remaining.slice(match[0].length);
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      tokens.push(
        <span key={key++} className="text-code-variable">
          {remaining[0]}
        </span>
      );
      remaining = remaining.slice(1);
    }
  }
  
  return tokens;
}
