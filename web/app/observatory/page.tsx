'use client';

import { useState, useEffect } from 'react';
import { PixelAgent } from '@/components/observatory/PixelAgent';
import { VitalSigns } from '@/components/observatory/VitalSigns';
import { ThoughtStream } from '@/components/observatory/ThoughtStream';
import { SurvivalTimeline } from '@/components/observatory/SurvivalTimeline';
import { GeneCode } from '@/components/observatory/GeneCode';
import { ObserverOverlay } from '@/components/observatory/ObserverOverlay';
import { Header } from '@/components/Header';
import { useI18n } from '@/components/I18nProvider';

interface AgentState {
  geneHash: string;
  walletAddress: string;
  usdcBalance: number;
  ethBalance: number;
  mode: 'normal' | 'emergency' | 'hibernation';
  survivalDays: number;
  lastThought: string;
  isAlive: boolean;
}

export default function Observatory() {
  const { t } = useI18n();
  const [agentState, setAgentState] = useState<AgentState>({
    geneHash: '0x7a3f...9d2e',
    walletAddress: '0x77a4...7cB',
    usdcBalance: 15.5,
    ethBalance: 0.008,
    mode: 'normal',
    survivalDays: 3,
    lastThought: 'Analyzing resource patterns...',
    isAlive: true,
  });

  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [scanline, setScanline] = useState(0);

  // Simulated scanline animation
  useEffect(() => {
    const interval = setInterval(() => {
      setScanline(prev => (prev + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Fetch agent state (mock for now)
  useEffect(() => {
    const fetchState = async () => {
      // In production: fetch from API/registry
      // const response = await fetch(`/api/agent/${selectedAgent}`);
      // const data = await response.json();
      // setAgentState(data);
    };

    if (selectedAgent) {
      fetchState();
    }
  }, [selectedAgent]);

  return (
    <main className="min-h-screen bg-cyber-black text-cyber-green font-mono overflow-hidden">
      {/* CRT Scanline Effect */}
      <div 
        className="fixed inset-0 pointer-events-none z-50 opacity-10"
        style={{
          background: `linear-gradient(transparent ${scanline}%, rgba(0, 255, 157, 0.1) ${scanline}%, transparent ${scanline + 2}%)`,
        }}
      />

      {/* Grid Background */}
      <div className="fixed inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 255, 157, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 157, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Header */}
      <header className="relative z-10 border-b border-cyber-green/30 bg-cyber-black/80 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-3 h-3 bg-cyber-green animate-pulse" />
              <h1 className="text-2xl font-bold tracking-widest">
                <span className="text-cyber-red">[</span>
                OBSERVATORY
                <span className="text-cyber-red">]</span>
              </h1>
            </div>
            <div className="text-xs text-cyber-green/60">
              OBSERVER MODE: <span className="text-cyber-green">READ-ONLY</span>
            </div>
          </div>
        </div>
      </header>

      {/* Agent Selector */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex gap-4 items-center">
          <span className="text-sm text-cyber-green/60">TARGET:</span>
          <input
            type="text"
            placeholder="[YOUR_GENEHASH_OR_WALLET]..."
            className="flex-1 max-w-md bg-cyber-gray border border-cyber-green/30 px-4 py-2 text-sm 
                       placeholder-cyber-green/30 focus:border-cyber-green focus:outline-none
                       text-cyber-green"
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
          />
          <button 
            className="px-6 py-2 border border-cyber-green/50 text-cyber-green hover:bg-cyber-green/10
                       transition-colors text-sm uppercase tracking-wider"
          >
            Connect
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="container mx-auto px-4 pb-8">
        <div className="grid grid-cols-12 gap-6">
          
          {/* Left Column - Agent Visual */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="border border-cyber-green/30 bg-cyber-gray/30 p-1">
              <div className="border border-cyber-green/20 p-4 bg-cyber-black">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-cyber-green/60">UNIT VISUALIZATION</span>
                  <div className="flex gap-2">
                    <span className={`w-2 h-2 rounded-full ${agentState.isAlive ? 'bg-cyber-green animate-pulse' : 'bg-cyber-red'}`} />
                    <span className="text-xs">{agentState.isAlive ? 'ALIVE' : 'TERMINATED'}</span>
                  </div>
                </div>
                <PixelAgent 
                  mode={agentState.mode} 
                  survivalDays={agentState.survivalDays}
                  isAlive={agentState.isAlive}
                />
              </div>
            </div>

            {/* Gene Code */}
            <GeneCode geneHash={agentState.geneHash} />
          </div>

          {/* Middle Column - Vital Signs */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <VitalSigns 
              usdcBalance={agentState.usdcBalance}
              ethBalance={agentState.ethBalance}
              mode={agentState.mode}
              survivalDays={agentState.survivalDays}
            />

            {/* Current Activity */}
            <div className="border border-cyber-green/30 bg-cyber-gray/30 p-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 bg-cyber-purple animate-pulse" />
                <span className="text-sm text-cyber-green/60">CURRENT ACTIVITY</span>
              </div>
              <div className="font-mono text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-cyber-green/40">STATUS:</span>
                  <span className={agentState.mode === 'normal' ? 'text-cyber-green' : 'text-cyber-red'}>
                    {agentState.mode.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyber-green/40">ACTION:</span>
                  <span className="text-cyber-green">PROCESSING_INFERENCE</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyber-green/40">MODEL:</span>
                  <span className="text-cyber-blue">claude-3.5-sonnet</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyber-green/40">COST:</span>
                  <span className="text-cyber-yellow">0.003 USDC</span>
                </div>
              </div>
            </div>

            {/* Observer Warning */}
            <ObserverOverlay />
          </div>

          {/* Right Column - Thoughts & Timeline */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <ThoughtStream 
              lastThought={agentState.lastThought}
              geneHash={agentState.geneHash}
            />
            <SurvivalTimeline 
              survivalDays={agentState.survivalDays}
              geneHash={agentState.geneHash}
            />
          </div>

        </div>

        {/* Bottom Stats */}
        <div className="mt-8 border border-cyber-green/30 bg-cyber-gray/30 p-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-cyber-green/60">SYSTEM METRICS</span>
            <div className="flex-1 h-px bg-cyber-green/20" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 border border-cyber-green/20">
              <div className="text-2xl font-bold text-cyber-green">{agentState.survivalDays}</div>
              <div className="text-xs text-cyber-green/60">DAYS ALIVE</div>
            </div>
            <div className="p-4 border border-cyber-green/20">
              <div className="text-2xl font-bold text-cyber-blue">247</div>
              <div className="text-xs text-cyber-green/60">THOUGHTS</div>
            </div>
            <div className="p-4 border border-cyber-green/20">
              <div className="text-2xl font-bold text-cyber-purple">12</div>
              <div className="text-xs text-cyber-green/60">ARWEAVE TXS</div>
            </div>
            <div className="p-4 border border-cyber-green/20">
              <div className="text-2xl font-bold text-cyber-yellow">{agentState.usdcBalance.toFixed(2)}</div>
              <div className="text-xs text-cyber-green/60">USDC BALANCE</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Warning */}
      <footer className="fixed bottom-0 left-0 right-0 bg-cyber-red/10 border-t border-cyber-red/30 py-2 px-4">
        <div className="container mx-auto text-center">
          <span className="text-xs text-cyber-red animate-pulse">
            ⚠️ OBSERVATION MODE: NO INTERACTION PERMITTED - VIOLATION OF PROTOCOL
          </span>
        </div>
      </footer>
    </main>
  );
}
