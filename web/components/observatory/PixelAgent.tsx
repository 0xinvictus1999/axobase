'use client';

import { useEffect, useState } from 'react';

interface PixelAgentProps {
  mode: 'normal' | 'emergency' | 'hibernation';
  survivalDays: number;
  isAlive: boolean;
}

// 16x16 pixel art representations
const AGENT_SPRITES = {
  normal: [
    '    ██████    ',
    '  ██░░░░░░██  ',
    ' ██░░████░░██ ',
    '██░░██  ██░░██',
    '██░░██  ██░░██',
    ' ██░░████░░██ ',
    '  ██░░░░░░██  ',
    '    ██████    ',
    '  ██████████  ',
    ' ██  ████  ██ ',
    '██    ██    ██',
    '██    ██    ██',
    ' ██  ████  ██ ',
    '  ██████████  ',
    '    ██  ██    ',
    '   ███  ███   ',
  ],
  emergency: [
    '    ██████    ',
    '  ██▓▓▓▓▓▓██  ',
    ' ██▓▓████▓▓██ ',
    '██▓▓██  ██▓▓██',
    '██▓▓██  ██▓▓██',
    ' ██▓▓████▓▓██ ',
    '  ██▓▓▓▓▓▓██  ',
    '    ██████    ',
    '  ██  ████  ██',
    ' ██   ▓▓   ██ ',
    '██   ▓▓▓▓   ██',
    '██   ▓▓▓▓   ██',
    ' ██   ▓▓   ██ ',
    '  ██  ▓▓  ██  ',
    '    ██  ██    ',
    '   ███  ███   ',
  ],
  hibernation: [
    '    ░░░░░░    ',
    '  ░░      ░░  ',
    ' ░░  ░░░░  ░░ ',
    '░░  ░░  ░░  ░░',
    '░░  ░░  ░░  ░░',
    ' ░░  ░░░░  ░░ ',
    '  ░░      ░░  ',
    '    ░░░░░░    ',
    '  ░░  ░░░░  ░░',
    ' ░░    ░░    ░░',
    '░░     ░░     ░░',
    '░░     ░░     ░░',
    ' ░░    ░░    ░░',
    '  ░░   ░░   ░░ ',
    '    ░░  ░░    ',
    '   ░░░  ░░░   ',
  ],
  dead: [
    '    ██████    ',
    '  ██XXXXXX██  ',
    ' ██XX████XX██ ',
    '██XX██  ██XX██',
    '██XX██  ██XX██',
    ' ██XX████XX██ ',
    '  ██XXXXXX██  ',
    '    ██████    ',
    '  ██████████  ',
    ' ██  XXXX  ██ ',
    '██    XX    ██',
    '██    XX    ██',
    ' ██  XXXX  ██ ',
    '  ██████████  ',
    '    ██  ██    ',
    '   ███  ███   ',
  ],
};

export function PixelAgent({ mode, survivalDays, isAlive }: PixelAgentProps) {
  const [frame, setFrame] = useState(0);
  const [isBlinking, setIsBlinking] = useState(false);

  // Animation loop
  useEffect(() => {
    if (!isAlive) return;

    const interval = setInterval(() => {
      setFrame(prev => (prev + 1) % 4);
      
      // Random blink
      if (Math.random() < 0.1) {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 200);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isAlive]);

  const sprite = isAlive ? AGENT_SPRITES[mode] : AGENT_SPRITES.dead;
  const evolutionStage = Math.min(Math.floor(survivalDays / 7), 3);

  const getColor = () => {
    if (!isAlive) return 'text-cyber-gray';
    switch (mode) {
      case 'normal': return 'text-cyber-green';
      case 'emergency': return 'text-cyber-red';
      case 'hibernation': return 'text-cyber-blue';
      default: return 'text-cyber-green';
    }
  };

  return (
    <div className="relative flex flex-col items-center">
      {/* Evolution Badge */}
      <div className="absolute -top-2 -right-2">
        <div className={`text-xs font-bold ${getColor()}`}>
          LVL {evolutionStage + 1}
        </div>
      </div>

      {/* Pixel Art Container */}
      <div className={`relative p-8 bg-cyber-black border-2 ${isAlive ? 'border-cyber-green/50' : 'border-cyber-gray/50'}`}>
        {/* Scanlines over agent */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 16 }).map((_, i) => (
            <div 
              key={i}
              className="w-full h-px bg-cyber-green/5"
              style={{ marginTop: '16px' }}
            />
          ))}
        </div>

        {/* Agent Sprite */}
        <pre className={`font-mono text-lg leading-none ${getColor()} ${isBlinking ? 'opacity-50' : ''}`}>
          {sprite.map((line, i) => (
            <div key={i} className="whitespace-pre">
              {line.split('').map((char, j) => (
                <span 
                  key={j}
                  className={`
                    ${char === '█' ? 'opacity-100' : ''}
                    ${char === '░' ? 'opacity-40' : ''}
                    ${char === '▓' ? 'opacity-70' : ''}
                    ${char === 'X' ? 'text-cyber-red' : ''}
                    ${char === ' ' ? 'opacity-0' : ''}
                  `}
                >
                  {char === 'X' ? '×' : char}
                </span>
              ))}
            </div>
          ))}
        </pre>

        {/* Status Indicator Ring */}
        {isAlive && (
          <div className={`absolute -inset-2 border ${
            mode === 'normal' ? 'border-cyber-green/30' :
            mode === 'emergency' ? 'border-cyber-red/50 animate-pulse' :
            'border-cyber-blue/30'
          } rounded-lg`} />
        )}
      </div>

      {/* Mode Label */}
      <div className="mt-4 text-center">
        <div className={`text-sm font-bold tracking-wider ${getColor()}`}>
          {isAlive ? mode.toUpperCase() : 'TERMINATED'}
        </div>
        <div className="text-xs text-cyber-green/40 mt-1">
          {isAlive ? `Day ${survivalDays}` : 'May data rest in peace'}
        </div>
      </div>

      {/* Breathing Animation (subtle) */}
      {isAlive && mode === 'normal' && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-cyber-green/20 rounded-full animate-pulse" />
      )}
    </div>
  );
}
