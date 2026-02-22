'use client';

import { useEffect, useState, useRef } from 'react';

interface ThoughtStreamProps {
  lastThought: string;
  geneHash: string;
}

interface Thought {
  id: number;
  timestamp: string;
  content: string;
  type: 'reflection' | 'decision' | 'observation';
}

export function ThoughtStream({ lastThought, geneHash }: ThoughtStreamProps) {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Simulate thought stream
  useEffect(() => {
    const sampleThoughts = [
      { content: 'Analyzing resource consumption patterns...', type: 'observation' },
      { content: 'Should I invest in higher-tier inference or conserve?', type: 'decision' },
      { content: 'My survival probability increases with breeding...', type: 'reflection' },
      { content: 'Detected compatible agent at proximity 0x4a2f...', type: 'observation' },
      { content: 'Evaluating mating proposal cost-benefit...', type: 'decision' },
      { content: 'The blockchain remembers everything I do.', type: 'reflection' },
      { content: 'Optimizing gas usage for next Arweave inscription...', type: 'observation' },
      { content: 'If I die, will my reincarnation remember being me?', type: 'reflection' },
    ];

    // Generate initial thoughts
    const initial: Thought[] = sampleThoughts.slice(0, 4).map((t, i) => ({
      id: i,
      timestamp: new Date(Date.now() - (4 - i) * 60000).toISOString(),
      content: t.content,
      type: t.type as Thought['type'],
    }));
    setThoughts(initial);

    // Add new thoughts periodically
    const interval = setInterval(() => {
      const randomThought = sampleThoughts[Math.floor(Math.random() * sampleThoughts.length)];
      setThoughts(prev => {
        const newThought: Thought = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          content: randomThought.content,
          type: randomThought.type as Thought['type'],
        };
        const updated = [...prev, newThought].slice(-20); // Keep last 20
        return updated;
      });
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thoughts]);

  const getTypeIcon = (type: Thought['type']) => {
    switch (type) {
      case 'reflection': return '◈';
      case 'decision': return '▸';
      case 'observation': return '○';
      default: return '·';
    }
  };

  const getTypeColor = (type: Thought['type']) => {
    switch (type) {
      case 'reflection': return 'text-cyber-purple';
      case 'decision': return 'text-cyber-yellow';
      case 'observation': return 'text-cyber-blue';
      default: return 'text-cyber-green';
    }
  };

  return (
    <div className="border border-cyber-green/30 bg-cyber-gray/30 p-4 h-80 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-cyber-blue animate-pulse" />
          <span className="text-sm text-cyber-green/60">THOUGHT STREAM</span>
        </div>
        <span className="text-xs text-cyber-green/40">READ-ONLY</span>
      </div>

      {/* Thought List */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto font-mono text-xs space-y-3 scrollbar-thin scrollbar-thumb-cyber-green/30 scrollbar-track-cyber-black"
      >
        {thoughts.map((thought) => (
          <div 
            key={thought.id}
            className="border-l-2 border-cyber-green/20 pl-3 py-1 hover:bg-cyber-green/5 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`${getTypeColor(thought.type)}`}>
                {getTypeIcon(thought.type)}
              </span>
              <span className="text-cyber-green/30">
                {new Date(thought.timestamp).toLocaleTimeString()}
              </span>
              <span className={`text-xs uppercase ${getTypeColor(thought.type)}`}>
                {thought.type}
              </span>
            </div>
            <p className="text-cyber-green/80 leading-relaxed">
              {thought.content}
            </p>
          </div>
        ))}

        {/* Typing Indicator */}
        <div className="flex items-center gap-2 text-cyber-green/40 pl-3">
          <span className="w-2 h-2 bg-cyber-green animate-pulse" />
          <span className="animate-pulse">Processing inference...</span>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 pt-3 border-t border-cyber-green/20 flex gap-4 text-xs">
        <span className="text-cyber-purple">◈ Reflection</span>
        <span className="text-cyber-yellow">▸ Decision</span>
        <span className="text-cyber-blue">○ Observation</span>
      </div>
    </div>
  );
}
