'use client';

import { useState, useEffect } from 'react';

export function ObserverOverlay() {
  const [showWarning, setShowWarning] = useState(true);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Track mouse for "observation" effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Blink warning
  useEffect(() => {
    const interval = setInterval(() => {
      setShowWarning(prev => !prev);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Observation Crosshair (follows mouse slightly delayed) */}
      <div 
        className="fixed pointer-events-none z-40 mix-blend-difference hidden lg:block"
        style={{
          left: mousePosition.x - 20,
          top: mousePosition.y - 20,
          width: 40,
          height: 40,
        }}
      >
        <svg viewBox="0 0 40 40" className="w-full h-full opacity-30">
          {/* Outer ring */}
          <circle 
            cx="20" 
            cy="20" 
            r="18" 
            fill="none" 
            stroke="#00ff9d" 
            strokeWidth="1"
            strokeDasharray="4 2"
          />
          {/* Crosshair lines */}
          <line x1="20" y1="5" x2="20" y2="15" stroke="#00ff9d" strokeWidth="1" />
          <line x1="20" y1="25" x2="20" y2="35" stroke="#00ff9d" strokeWidth="1" />
          <line x1="5" y1="20" x2="15" y2="20" stroke="#00ff9d" strokeWidth="1" />
          <line x1="25" y1="20" x2="35" y2="20" stroke="#00ff9d" strokeWidth="1" />
          {/* Center dot */}
          <circle cx="20" cy="20" r="2" fill="#00ff9d" />
        </svg>
      </div>

      {/* Observer Warning Panel */}
      <div className={`
        border border-cyber-red/50 bg-cyber-red/10 p-4
        transition-opacity duration-500
        ${showWarning ? 'opacity-100' : 'opacity-50'}
      `}>
        <div className="flex items-start gap-3">
          <div className="text-2xl text-cyber-red animate-pulse">⚠</div>
          <div>
            <div className="text-sm font-bold text-cyber-red mb-1">
              OBSERVER PROTOCOL ACTIVE
            </div>
            <div className="text-xs text-cyber-green/60 space-y-1">
              <p>• You are viewing a live autonomous system</p>
              <p>• No interaction or control is permitted</p>
              <p>• All actions are self-determined by the agent</p>
              <p>• Interference would violate experimental integrity</p>
            </div>
          </div>
        </div>

        {/* Visual Lock Indicator */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <div className="w-16 h-1 bg-cyber-red/30 overflow-hidden">
            <div className="h-full bg-cyber-red animate-pulse" style={{ width: '100%' }} />
          </div>
          <span className="text-xs text-cyber-red font-bold">LOCKED</span>
          <div className="w-16 h-1 bg-cyber-red/30 overflow-hidden">
            <div className="h-full bg-cyber-red animate-pulse" style={{ width: '100%' }} />
          </div>
        </div>
      </div>

      {/* Corner Decorations */}
      <div className="fixed top-20 left-4 w-8 h-8 border-l-2 border-t-2 border-cyber-green/30 pointer-events-none" />
      <div className="fixed top-20 right-4 w-8 h-8 border-r-2 border-t-2 border-cyber-green/30 pointer-events-none" />
      <div className="fixed bottom-20 left-4 w-8 h-8 border-l-2 border-b-2 border-cyber-green/30 pointer-events-none" />
      <div className="fixed bottom-20 right-4 w-8 h-8 border-r-2 border-b-2 border-cyber-green/30 pointer-events-none" />

      {/* Recording Indicator */}
      <div className="fixed top-24 right-6 flex items-center gap-2 z-30">
        <div className="w-3 h-3 bg-cyber-red rounded-full animate-pulse" />
        <span className="text-xs text-cyber-red font-mono">REC</span>
      </div>

      {/* Timestamp Overlay */}
      <div className="fixed bottom-24 left-6 text-xs text-cyber-green/40 font-mono z-30">
        OBS_{new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)}
      </div>
    </>
  );
}
