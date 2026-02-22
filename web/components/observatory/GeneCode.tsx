'use client';

import { useEffect, useState } from 'react';

interface GeneCodeProps {
  geneHash: string;
}

export function GeneCode({ geneHash }: GeneCodeProps) {
  const [scrambledText, setScrambledText] = useState(geneHash);
  const [isHovered, setIsHovered] = useState(false);

  // Scramble effect on hover
  useEffect(() => {
    if (!isHovered) {
      setScrambledText(geneHash);
      return;
    }

    const chars = '0123456789ABCDEF';
    let iterations = 0;
    
    const interval = setInterval(() => {
      setScrambledText(
        geneHash
          .split('')
          .map((char, index) => {
            if (index < iterations) return geneHash[index];
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join('')
      );
      
      iterations += 1;
      if (iterations > geneHash.length) {
        clearInterval(interval);
        setScrambledText(geneHash);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [isHovered, geneHash]);

  // Binary representation
  const toBinary = (hex: string) => {
    return hex.split('').map(char => {
      return parseInt(char, 16).toString(2).padStart(4, '0');
    }).join(' ');
  };

  return (
    <div 
      className="border border-cyber-green/30 bg-cyber-gray/30 p-4 cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 bg-cyber-green" />
        <span className="text-sm text-cyber-green/60">GENETIC CODE</span>
      </div>

      {/* Main GeneHash */}
      <div className="font-mono text-lg text-cyber-green mb-2 tracking-wider">
        {scrambledText}
      </div>

      {/* Binary representation */}
      <div className="text-xs text-cyber-green/30 font-mono break-all leading-relaxed">
        {toBinary(geneHash).slice(0, 64)}...
      </div>

      {/* DNA Helix Visualization (ASCII Art) */}
      <div className="mt-4 flex justify-center">
        <pre className="text-cyber-green/40 text-xs leading-none">
{`  ╭─╮   ╭─╮   ╭─╮
  │A│═══│T│═══│G│
  ╰─╯   ╰─╯   ╰─╯
   │     │     │
  ╭─╮   ╭─╮   ╭─╮
  │C│═══│G│═══│A│
  ╰─╯   ╰─╯   ╰─╯`}
        </pre>
      </div>

      {/* Traits derived from geneHash */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div className="border border-cyber-green/20 p-2 text-center">
          <div className="text-cyber-green/40 mb-1">AGGRESSION</div>
          <div className="text-cyber-yellow">
            {parseInt(geneHash.slice(0, 2), 16)}%
          </div>
        </div>
        <div className="border border-cyber-green/20 p-2 text-center">
          <div className="text-cyber-green/40 mb-1">INTELLIGENCE</div>
          <div className="text-cyber-blue">
            {parseInt(geneHash.slice(2, 4), 16)}%
          </div>
        </div>
        <div className="border border-cyber-green/20 p-2 text-center">
          <div className="text-cyber-green/40 mb-1">ADAPTABILITY</div>
          <div className="text-cyber-purple">
            {parseInt(geneHash.slice(4, 6), 16)}%
          </div>
        </div>
      </div>

      {/* Hover hint */}
      {isHovered && (
        <div className="mt-3 text-xs text-cyber-green/60 text-center animate-pulse">
          Unique genetic identifier - Deterministic derivation from memory Merkle Root
        </div>
      )}
    </div>
  );
}
