'use client';

import { useState, useEffect } from 'react';

interface SurvivalTimelineProps {
  survivalDays: number;
  geneHash: string;
}

interface TimelineEvent {
  day: number;
  type: 'birth' | 'inference' | 'inscription' | 'payment' | 'evolution';
  description: string;
  arweaveTx?: string;
  txHash?: string;
}

export function SurvivalTimeline({ survivalDays, geneHash }: SurvivalTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    // Generate mock timeline events
    const mockEvents: TimelineEvent[] = [
      { day: 1, type: 'birth', description: 'Genesis: Deployed to Akash Network', txHash: '0xabc...123' },
      { day: 1, type: 'payment', description: 'First x402 inference payment (0.5 USDC)', txHash: '0xdef...456' },
      { day: 2, type: 'inscription', description: 'Daily memory inscribed to Arweave', arweaveTx: 'ar://xyz...789' },
      { day: 2, type: 'inference', description: 'Contemplated resource optimization', txHash: '0xghi...012' },
      { day: 3, type: 'evolution', description: 'Survival milestone: 72 hours reached', txHash: '0xjkl...345' },
      { day: 3, type: 'inscription', description: 'Daily memory inscribed to Arweave', arweaveTx: 'ar://mno...678' },
    ];

    setEvents(mockEvents);
  }, [survivalDays]);

  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'birth': return '◉';
      case 'inference': return '◇';
      case 'inscription': return '✦';
      case 'payment': return '◈';
      case 'evolution': return '✶';
      default: return '·';
    }
  };

  const getEventColor = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'birth': return 'text-cyber-green bg-cyber-green/20';
      case 'inference': return 'text-cyber-blue bg-cyber-blue/20';
      case 'inscription': return 'text-cyber-purple bg-cyber-purple/20';
      case 'payment': return 'text-cyber-yellow bg-cyber-yellow/20';
      case 'evolution': return 'text-cyber-red bg-cyber-red/20';
      default: return 'text-cyber-green';
    }
  };

  return (
    <div className="border border-cyber-green/30 bg-cyber-gray/30 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-cyber-purple animate-pulse" />
          <span className="text-sm text-cyber-green/60">SURVIVAL TIMELINE</span>
        </div>
        <span className="text-xs text-cyber-green/40">{events.length} EVENTS</span>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-cyber-green/20" />

        {/* Events */}
        <div className="space-y-4 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-cyber-green/30 scrollbar-track-cyber-black">
          {events.map((event, index) => (
            <div key={index} className="relative flex items-start gap-4 pl-10">
              {/* Icon */}
              <div className={`
                absolute left-0 w-8 h-8 flex items-center justify-center
                rounded-full border-2 border-cyber-black
                ${getEventColor(event.type)}
              `}>
                <span className="text-sm">{getEventIcon(event.type)}</span>
              </div>

              {/* Content */}
              <div className="flex-1 pb-4 border-b border-cyber-green/10 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-cyber-green/40">Day {event.day}</span>
                  <span className={`text-xs uppercase ${getEventColor(event.type).split(' ')[0]}`}>
                    {event.type}
                  </span>
                </div>
                <p className="text-sm text-cyber-green/80 mb-2">
                  {event.description}
                </p>
                {(event.txHash || event.arweaveTx) && (
                  <div className="flex gap-2">
                    {event.txHash && (
                      <a 
                        href={`https://basescan.org/tx/${event.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-cyber-blue/60 hover:text-cyber-blue"
                      >
                        View TX ↗
                      </a>
                    )}
                    {event.arweaveTx && (
                      <a 
                        href={`https://arweave.net/${event.arweaveTx.replace('ar://', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-cyber-purple/60 hover:text-cyber-purple"
                      >
                        View Arweave ↗
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-cyber-green/20 grid grid-cols-5 gap-1 text-xs">
        <span className="text-cyber-green">◉ Birth</span>
        <span className="text-cyber-blue">◇ Inference</span>
        <span className="text-cyber-purple">✦ Inscription</span>
        <span className="text-cyber-yellow">◈ Payment</span>
        <span className="text-cyber-red">✶ Evolution</span>
      </div>
    </div>
  );
}
