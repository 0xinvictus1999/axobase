'use client';

import { useEffect, useState } from 'react';

interface VitalSignsProps {
  usdcBalance: number;
  ethBalance: number;
  mode: 'normal' | 'emergency' | 'hibernation';
  survivalDays: number;
}

export function VitalSigns({ usdcBalance, ethBalance, mode, survivalDays }: VitalSignsProps) {
  const [pulseRate, setPulseRate] = useState(60);

  // Simulate vital signs fluctuation
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseRate(prev => {
        const variance = Math.random() * 10 - 5;
        if (mode === 'emergency') return Math.max(100, 100 + variance);
        if (mode === 'hibernation') return Math.min(40, 40 + variance);
        return Math.max(60, 60 + variance);
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [mode]);

  const getHealthColor = () => {
    if (usdcBalance < 2) return 'text-cyber-red';
    if (usdcBalance < 5) return 'text-cyber-yellow';
    return 'text-cyber-green';
  };

  const getHealthBarWidth = () => {
    const maxHealth = 20;
    return Math.min((usdcBalance / maxHealth) * 100, 100);
  };

  return (
    <div className="border border-cyber-green/30 bg-cyber-gray/30 p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2 h-2 bg-cyber-red animate-pulse" />
        <span className="text-sm text-cyber-green/60">VITAL SIGNS</span>
      </div>

      {/* Health Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-cyber-green/40">SURVIVAL CAPACITY</span>
          <span className={getHealthColor()}>{usdcBalance.toFixed(2)} USDC</span>
        </div>
        <div className="h-4 bg-cyber-black border border-cyber-green/30 relative overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${
              usdcBalance < 2 ? 'bg-cyber-red' :
              usdcBalance < 5 ? 'bg-cyber-yellow' :
              'bg-cyber-green'
            }`}
            style={{ width: `${getHealthBarWidth()}%` }}
          />
          {/* Grid overlay */}
          <div className="absolute inset-0 flex">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex-1 border-r border-cyber-black/50" />
            ))}
          </div>
        </div>
        <div className="flex justify-between text-xs mt-1 text-cyber-green/30">
          <span>CRITICAL</span>
          <span>NORMAL</span>
          <span>HEALTHY</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="border border-cyber-green/20 p-3">
          <div className="text-xs text-cyber-green/40 mb-1">PULSE</div>
          <div className={`text-xl font-bold ${
            pulseRate > 100 ? 'text-cyber-red' :
            pulseRate < 50 ? 'text-cyber-blue' :
            'text-cyber-green'
          }`}>
            {Math.round(pulseRate)} BPM
          </div>
        </div>
        <div className="border border-cyber-green/20 p-3">
          <div className="text-xs text-cyber-green/40 mb-1">GAS RESERVE</div>
          <div className="text-xl font-bold text-cyber-yellow">
            {ethBalance.toFixed(4)} ETH
          </div>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-cyber-green/40">BREEDING READINESS:</span>
          <span className={survivalDays >= 3 && usdcBalance >= 20 ? 'text-cyber-green' : 'text-cyber-red'}>
            {survivalDays >= 3 && usdcBalance >= 20 ? 'READY' : 'NOT READY'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-cyber-green/40">INFERENCE CAPACITY:</span>
          <span className={usdcBalance >= 1 ? 'text-cyber-green' : 'text-cyber-red'}>
            {usdcBalance >= 1 ? 'OPERATIONAL' : 'INSUFFICIENT'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-cyber-green/40">MEMORY INTEGRITY:</span>
          <span className="text-cyber-green">100%</span>
        </div>
      </div>

      {/* EKG-style Graph */}
      <div className="mt-4 h-16 border border-cyber-green/20 bg-cyber-black relative overflow-hidden">
        <svg className="absolute inset-0 w-full h-full">
          <polyline
            fill="none"
            stroke="#00ff9d"
            strokeWidth="1"
            points={Array.from({ length: 50 }).map((_, i) => {
              const x = (i / 49) * 100;
              const baseY = 50;
              const variance = mode === 'emergency' 
                ? Math.random() * 60 - 30
                : Math.random() * 20 - 10;
              const spike = i % 10 === 0 ? (Math.random() * 40 - 20) : 0;
              return `${x},${baseY + variance + spike}`;
            }).join(' ')}
            className="opacity-60"
          />
        </svg>
        {/* Scan line */}
        <div className="absolute inset-y-0 w-px bg-cyber-green/50 animate-ping" style={{ left: '100%' }} />
      </div>
    </div>
  );
}
