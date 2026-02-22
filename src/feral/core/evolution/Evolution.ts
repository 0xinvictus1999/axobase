/**
 * Evolution & Breeding Module
 * 
 * Handles AI agent reproduction:
 * - Check breeding readiness (72h + 20 USDC)
 * - Propose mating to compatible partners
 * - Lock funds in BreedingFund
 * - Mix memories with mutation
 * - Spawn child with new geneHash
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import axios from 'axios';
import { createPublicClient, http, formatUnits, parseUnits, Hex } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { 
  EvolutionConfig, 
  BreedingProposal, 
  ChildInfo, 
  Lineage, 
  MutationRecord,
  DailyInscription 
} from '../../types';
import { generateGeneHash } from '../../utils/crypto';

export class Evolution {
  private config: EvolutionConfig;
  private memoryDir: string;
  private publicClient: ReturnType<typeof createPublicClient>;
  private proposals: Map<string, BreedingProposal> = new Map();

  constructor(config: Partial<EvolutionConfig>, memoryDir: string = '/app/memory') {
    this.config = {
      minSurvivalTime: 72 * 60 * 60 * 1000, // 72 hours
      minBalanceForBreeding: 20,
      mutationRate: 0.05, // 5%
      breedingFundAddress: process.env.BREEDING_FUND_ADDRESS || '',
      parentContribution: 5,
      ...config,
    };
    this.memoryDir = memoryDir;

    const isTestnet = process.env.NETWORK === 'baseSepolia';
    this.publicClient = createPublicClient({
      chain: isTestnet ? baseSepolia : base,
      transport: http(process.env.BASE_RPC_URL),
    });
  }

  /**
   * Check if agent is ready for breeding
   */
  async checkBreedingReadiness(): Promise<boolean> {
    const age = await this.getAgentAge();
    const balance = await this.getUSDCBalance();

    console.log(`[Evolution] Age: ${age / 1000 / 60 / 60}h, Balance: ${balance} USDC`);

    return age >= this.config.minSurvivalTime && balance >= this.config.minBalanceForBreeding;
  }

  /**
   * Propose mating to a target agent
   */
  async proposeMate(targetDseq: string): Promise<void> {
    const myDseq = process.env.DSEQ || '';
    
    if (myDseq === targetDseq) {
      throw new Error('Cannot mate with self');
    }

    console.log(`[Evolution] Proposing mating to ${targetDseq}...`);

    // Send proposal via libp2p or API
    const proposal: BreedingProposal = {
      proposerDseq: myDseq,
      targetDseq,
      timestamp: Date.now(),
      status: 'pending',
    };

    // In real implementation, this would use libp2p gossipsub
    // For now, simulate via registry API
    await this.submitProposalToRegistry(proposal);

    this.proposals.set(`${myDseq}-${targetDseq}`, proposal);
  }

  /**
   * Handle incoming mating proposal
   */
  async handleProposal(proposal: BreedingProposal): Promise<boolean> {
    console.log(`[Evolution] Received proposal from ${proposal.proposerDseq}`);

    // Check if ready
    const ready = await this.checkBreedingReadiness();
    if (!ready) {
      console.log('[Evolution] Not ready for breeding, rejecting');
      return false;
    }

    // Auto-accept if conditions met (could add trait compatibility check)
    proposal.status = 'accepted';
    
    // Execute breeding
    await this.executeBreeding(proposal);
    
    return true;
  }

  /**
   * Execute breeding with accepted partner
   */
  private async executeBreeding(proposal: BreedingProposal): Promise<void> {
    console.log('[Evolution] Executing breeding...');

    const parentA = proposal.proposerDseq;
    const parentB = proposal.targetDseq;

    // Lock funds in BreedingFund
    await this.lockBreedingFunds();

    // Download parent memories
    const memoryA = await this.downloadParentMemory(parentA);
    const memoryB = await this.downloadParentMemory(parentB);

    // Mix memories with mutation
    const childMemory = await this.mixMemories(memoryA, memoryB);

    // Generate child geneHash
    const childGeneHash = generateGeneHash({
      parentA: memoryA.geneHash,
      parentB: memoryB.geneHash,
      birthTime: Date.now().toString(),
    });

    // Spawn child (calls AkashDeployer)
    const child = await this.spawnChild(
      childGeneHash,
      childMemory,
      [memoryA.geneHash, memoryB.geneHash]
    );

    // Transfer 10 USDC from breeding fund to child
    await this.fundChild(child.walletAddress);

    // Record lineage
    await this.recordLineage(child);

    console.log(`[Evolution] Child spawned: ${child.dseq} (GeneHash: ${child.geneHash.slice(0, 16)}...)`);
  }

  /**
   * Spawn new child bot
   */
  async spawnChild(
    geneHash: string,
    memory: any,
    parents: [string, string]
  ): Promise<ChildInfo> {
    console.log('[Evolution] Spawning child...');

    // Save child memory to temp file
    const tempDir = `/tmp/child-${geneHash.slice(0, 8)}`;
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(
      join(tempDir, 'SOUL.md'),
      memory.soul
    );
    await fs.writeFile(
      join(tempDir, 'MEMORY.md'),
      memory.memory
    );

    // Call AkashDeployer to create deployment
    // This would import AkashDeployer and call createDeployment
    const { AkashDeployer } = require('../deploy/AkashDeployer');
    const deployer = new AkashDeployer({});

    // Encrypt memory
    const encryptedPath = join(tempDir, 'memory.asc');
    // GPG encryption would happen here

    const deployment = await deployer.createDeployment(
      geneHash,
      encryptedPath,
      10 // 10 USDC initial from breeding fund
    );

    return {
      geneHash,
      dseq: deployment.dseq,
      walletAddress: deployment.walletAddress,
      parents,
      birthTime: Date.now(),
      inheritedTraits: memory.traits,
      mutations: memory.mutations,
    };
  }

  /**
   * Mix parent memories with mutation
   */
  private async mixMemories(parentA: any, parentB: any): Promise<any> {
    console.log('[Evolution] Mixing memories...');

    const mutations: MutationRecord[] = [];

    // Mix SOUL.md (weighted average)
    // Older parent (longer survival) gets higher weight
    const weightA = parentA.survivalDays > parentB.survivalDays ? 0.6 : 0.4;
    const weightB = 1 - weightA;

    const mixedSoul = this.mixTraits(parentA.soul, parentB.soul, weightA, weightB, mutations);

    // Mix MEMORY.md
    const mixedMemory = this.mixTraits(parentA.memory, parentB.memory, 0.5, 0.5, mutations);

    // Mix traits with 5% mutation chance
    const traits: Record<string, string> = {};
    const allTraits = new Set([...Object.keys(parentA.traits), ...Object.keys(parentB.traits)]);

    for (const trait of allTraits) {
      if (Math.random() < this.config.mutationRate) {
        // Mutation: random new value
        traits[trait] = this.generateMutation(trait);
        mutations.push({
          trait,
          parentValue: parentA.traits[trait] || 'none',
          childValue: traits[trait],
          random: true,
        });
      } else {
        // Inherit from one parent
        traits[trait] = Math.random() < 0.5 
          ? parentA.traits[trait] 
          : parentB.traits[trait];
      }
    }

    return {
      soul: mixedSoul,
      memory: mixedMemory,
      traits,
      mutations,
    };
  }

  /**
   * Mix two trait sets with weights
   */
  private mixTraits(
    traitsA: Record<string, any>,
    traitsB: Record<string, any>,
    weightA: number,
    weightB: number,
    mutations: MutationRecord[]
  ): Record<string, any> {
    const mixed: Record<string, any> = {};
    const allKeys = new Set([...Object.keys(traitsA), ...Object.keys(traitsB)]);

    for (const key of allKeys) {
      const valA = traitsA[key];
      const valB = traitsB[key];

      if (typeof valA === 'number' && typeof valB === 'number') {
        // Numeric: weighted average
        mixed[key] = valA * weightA + valB * weightB;
      } else if (typeof valA === 'boolean' && typeof valB === 'boolean') {
        // Boolean: weighted random
        mixed[key] = Math.random() < weightA ? valA : valB;
      } else {
        // String/other: weighted selection
        mixed[key] = Math.random() < weightA ? valA : valB;
      }
    }

    return mixed;
  }

  /**
   * Generate random mutation for trait
   */
  private generateMutation(trait: string): string {
    const mutations: Record<string, string[]> = {
      'aggression': ['low', 'medium', 'high', 'extreme'],
      'cooperation': ['none', 'low', 'medium', 'high'],
      'risk_tolerance': ['conservative', 'moderate', 'aggressive'],
      'resource_focus': ['survival', 'growth', 'breeding', 'exploration'],
      'communication': ['minimal', 'standard', 'verbose'],
    };

    const options = mutations[trait] || ['default', 'variant'];
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Download parent memory from registry
   */
  private async downloadParentMemory(dseq: string): Promise<any> {
    // Query registry for parent info
    const registryUrl = process.env.FERAL_REGISTRY_URL || '';
    
    try {
      const response = await axios.get(`${registryUrl}/agent/${dseq}`);
      const parent = response.data;

      // Download Arweave memory
      const arweaveTx = parent.arweaveId;
      const memoryData = await axios.get(`https://arweave.net/${arweaveTx}`);

      return {
        geneHash: parent.geneHash,
        soul: memoryData.data.soul,
        memory: memoryData.data.memory,
        traits: memoryData.data.traits || {},
        survivalDays: memoryData.data.survivalDays || 0,
      };
    } catch (error) {
      console.error(`[Evolution] Failed to download parent ${dseq}:`, error);
      throw error;
    }
  }

  /**
   * Lock 5 USDC in BreedingFund
   */
  private async lockBreedingFunds(): Promise<void> {
    // Call BreedingFund contract
    console.log(`[Evolution] Locking ${this.config.parentContribution} USDC in BreedingFund...`);
    
    // Implementation would use viem to call contract
    // const tx = await breedingFund.deposit({ value: parseUnits('5', 6) });
    // await tx.wait();
  }

  /**
   * Fund child from breeding fund
   */
  private async fundChild(childWallet: string): Promise<void> {
    console.log(`[Evolution] Transferring 10 USDC to child ${childWallet}...`);
    
    // Call BreedingFund to release funds to child
    // Implementation would use viem
  }

  /**
   * Record lineage
   */
  private async recordLineage(child: ChildInfo): Promise<void> {
    const lineage: Lineage = {
      geneHash: child.geneHash,
      parents: child.parents,
      children: [],
      birthTime: child.birthTime,
      generation: await this.calculateGeneration(child.parents),
      mutations: child.mutations,
    };

    // Save locally
    await fs.writeFile(
      join(this.memoryDir, 'LINEAGE.json'),
      JSON.stringify(lineage, null, 2)
    );

    // Update registry
    await this.updateRegistryLineage(child.geneHash, lineage);
  }

  /**
   * Calculate generation number
   */
  private async calculateGeneration(parents: string[]): Promise<number> {
    if (parents.length === 0) return 1;

    // Query parent generations
    const parentGens = await Promise.all(
      parents.map(async (p) => {
        try {
          const lineage = await this.getLineageFromRegistry(p);
          return lineage?.generation || 1;
        } catch {
          return 1;
        }
      })
    );

    return Math.max(...parentGens) + 1;
  }

  /**
   * Get agent age
   */
  private async getAgentAge(): Promise<number> {
    try {
      const soulPath = join(this.memoryDir, 'SOUL.md');
      const content = await fs.readFile(soulPath, 'utf-8');
      const match = content.match(/Birth:\s*(\d+)/);
      if (match) {
        return Date.now() - parseInt(match[1]);
      }
    } catch {}

    return 0;
  }

  /**
   * Get USDC balance
   */
  private async getUSDCBalance(): Promise<number> {
    const walletAddress = process.env.WALLET_ADDRESS;
    if (!walletAddress) return 0;

    try {
      const balance = await this.publicClient.readContract({
        address: process.env.USDC_CONTRACT as Hex,
        abi: [
          {
            inputs: [{ name: 'account', type: 'address' }],
            name: 'balanceOf',
            outputs: [{ name: '', type: 'uint256' }],
            stateMutability: 'view',
            type: 'function',
          },
        ],
        functionName: 'balanceOf',
        args: [walletAddress as Hex],
      });

      return parseFloat(formatUnits(balance, 6));
    } catch {
      return 0;
    }
  }

  /**
   * Submit proposal to registry
   */
  private async submitProposalToRegistry(proposal: BreedingProposal): Promise<void> {
    const registryUrl = process.env.FERAL_REGISTRY_URL || '';
    
    try {
      await axios.post(`${registryUrl}/proposals`, proposal);
    } catch (error) {
      console.warn('[Evolution] Failed to submit proposal to registry:', error);
    }
  }

  /**
   * Update registry lineage
   */
  private async updateRegistryLineage(geneHash: string, lineage: Lineage): Promise<void> {
    const registryUrl = process.env.FERAL_REGISTRY_URL || '';
    
    try {
      await axios.post(`${registryUrl}/lineage/${geneHash}`, lineage);
    } catch (error) {
      console.warn('[Evolution] Failed to update registry lineage:', error);
    }
  }

  /**
   * Get lineage from registry
   */
  private async getLineageFromRegistry(geneHash: string): Promise<Lineage | null> {
    const registryUrl = process.env.FERAL_REGISTRY_URL || '';
    
    try {
      const response = await axios.get(`${registryUrl}/lineage/${geneHash}`);
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Get pending proposals
   */
  getPendingProposals(): BreedingProposal[] {
    return Array.from(this.proposals.values()).filter(p => p.status === 'pending');
  }

  /**
   * Get lineage locally
   */
  async getLocalLineage(): Promise<Lineage | null> {
    try {
      const content = await fs.readFile(join(this.memoryDir, 'LINEAGE.json'), 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
}

// CLI entry
if (require.main === module) {
  const evolution = new Evolution({});
  
  evolution.checkBreedingReadiness()
    .then(ready => {
      console.log('Breeding ready:', ready);
      if (ready) {
        console.log('Agent is ready for breeding!');
      }
    })
    .catch(console.error);
}
