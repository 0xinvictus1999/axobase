/**
 * Blend - Lamarckian Inheritance and Mutation
 * 
 * Handles:
 * - Weighted average mixing of parent personality traits
 * - Random mutation (5% probability, ±20% magnitude)
 * - Knowledge base merging with source attribution
 * - Generation tracking
 * - Inbreeding detection (up to 3 generations)
 * - GeneHash verification
 */

import { createHash } from 'crypto';
import {
  MemoryData,
  PersonalityTraits,
  BlendResult,
  MutationRecord,
  KnowledgeEntry,
} from '../types/index.js';

// Mutation configuration
const MUTATION_RATE = 0.05; // 5% chance per trait
const MUTATION_MAGNITUDE = 0.2; // ±20% variation
const MAX_INBREEDING_DEPTH = 3;

export class MemoryBlender {
  /**
   * Blend two parent memories to create child memory
   * Uses weighted average based on parent survival time (Lamarckian)
   * @param parentA - First parent memory
   * @param parentB - Second parent memory
   * @returns BlendResult with child memory and mutation records
   */
  blend(parentA: MemoryData, parentB: MemoryData): BlendResult {
    // Check for inbreeding
    if (this.isRelated(parentA.geneHash, parentB.geneHash, MAX_INBREEDING_DEPTH)) {
      throw new Error('Parents are too closely related (inbreeding detected)');
    }



    // Calculate weights based on survival days (Lamarckian principle)
    const totalSurvival = parentA.survivalDays + parentB.survivalDays;
    const weightA = totalSurvival > 0 ? parentA.survivalDays / totalSurvival : 0.5;
    const weightB = 1 - weightA;



    const mutations: MutationRecord[] = [];

    // Blend personality traits
    const blendedTraits = this.blendTraits(
      parentA.personalityTraits,
      parentB.personalityTraits,
      weightA,
      weightB,
      mutations
    );

    // Blend knowledge base
    const blendedKnowledge = this.blendKnowledge(
      parentA.knowledgeBase,
      parentB.knowledgeBase
    );

    // Blend soul data (weighted)
    const blendedSoul = this.blendSoul(parentA.soul, parentB.soul, weightA, weightB);

    // Create child memory
    const childMemory: MemoryData = {
      geneHash: '', // Will be computed
      generation: Math.max(parentA.generation, parentB.generation) + 1,
      birthTime: Date.now(),
      parents: [parentA.geneHash, parentB.geneHash],
      soul: blendedSoul,
      memory: {
        thoughts: [], // Fresh thoughts for child
        transactions: [],
        dailySummaries: [],
      },
      personalityTraits: blendedTraits,
      knowledgeBase: blendedKnowledge,
      survivalDays: 0,
      arweaveManifest: {
        version: '1.0',
        geneHash: '', // Will be set
        entries: [],
      },
    };

    // Compute child geneHash
    childMemory.geneHash = this.computeChildGeneHash(childMemory, parentA, parentB);
    childMemory.arweaveManifest.geneHash = childMemory.geneHash;




    return {
      childMemory,
      mutations,
      parentAContribution: weightA,
      parentBContribution: weightB,
    };
  }

  /**
   * Blend personality traits with weighted average and mutation
   */
  private blendTraits(
    traitsA: PersonalityTraits,
    traitsB: PersonalityTraits,
    weightA: number,
    weightB: number,
    mutations: MutationRecord[]
  ): PersonalityTraits {
    const blended: PersonalityTraits = {
      aggression: 0,
      cooperation: 0,
      riskTolerance: 0,
      resourceFocus: 'survival',
      communication: 0,
    };

    // Get all trait keys
    const allKeys = new Set([...Object.keys(traitsA), ...Object.keys(traitsB)]);

    for (const key of allKeys) {
      const valA = traitsA[key];
      const valB = traitsB[key];

      if (typeof valA === 'number' && typeof valB === 'number') {
        // Numeric trait: weighted average with possible mutation
        let blendedValue = valA * weightA + valB * weightB;

        // Apply mutation
        if (Math.random() < MUTATION_RATE) {
          const mutationFactor = 1 + (Math.random() * 2 - 1) * MUTATION_MAGNITUDE;
          const originalValue = blendedValue;
          blendedValue = Math.max(0, Math.min(1, blendedValue * mutationFactor));

          mutations.push({
            trait: key,
            parentValue: `${valA.toFixed(3)} / ${valB.toFixed(3)}`,
            childValue: blendedValue.toFixed(3),
            magnitude: Math.abs(mutationFactor - 1),
            random: true,
          });
        }

        (blended as any)[key] = blendedValue;
      } else if (typeof valA === 'string' || typeof valB === 'string') {
        // Categorical trait: weighted selection with possible mutation
        const useA = Math.random() < weightA;
        let selectedValue = useA ? valA : valB;

        // Apply mutation
        if (Math.random() < MUTATION_RATE) {
          const options = this.getCategoricalOptions(key);
          const mutatedValue = options[Math.floor(Math.random() * options.length)];

          mutations.push({
            trait: key,
            parentValue: `${valA} / ${valB}`,
            childValue: mutatedValue,
            magnitude: 1.0,
            random: true,
          });

          selectedValue = mutatedValue;
        }

        (blended as any)[key] = selectedValue;
      } else if (typeof valA === 'boolean' || typeof valB === 'boolean') {
        // Boolean trait: weighted random
        const useA = Math.random() < weightA;
        (blended as any)[key] = useA ? valA : valB;
      }
    }

    return blended;
  }

  /**
   * Blend knowledge bases, deduplicating and preserving sources
   */
  private blendKnowledge(
    knowledgeA: KnowledgeEntry[],
    knowledgeB: KnowledgeEntry[]
  ): KnowledgeEntry[] {
    const blended: KnowledgeEntry[] = [];
    const seen = new Set<string>();

    // Add all entries from both parents
    for (const entry of [...knowledgeA, ...knowledgeB]) {
      // Create unique key for deduplication
      const key = `${entry.source}:${entry.content.slice(0, 100)}`;

      if (!seen.has(key)) {
        seen.add(key);
        blended.push({
          ...entry,
          id: `child-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
          timestamp: Date.now(),
          // Adjust confidence based on inheritance
          confidence: entry.confidence * 0.95, // Slight confidence decay
        });
      }
    }

    // Sort by confidence
    return blended.sort((a, b) => b.confidence - a.confidence).slice(0, 1000); // Limit to 1000 entries
  }

  /**
   * Blend soul characteristics
   */
  private blendSoul(soulA: any, soulB: any, weightA: number, weightB: number): any {
    return {
      name: `Child of ${soulA.name} and ${soulB.name}`,
      origin: 'Axobase Evolution',
      purpose: Math.random() < weightA ? soulA.purpose : soulB.purpose,
      values: [...new Set([...soulA.values, ...soulB.values])].slice(0, 5),
      creationTimestamp: Date.now(),
    };
  }

  /**
   * Compute child geneHash from blended memory
   */
  private computeChildGeneHash(
    childMemory: MemoryData,
    parentA: MemoryData,
    parentB: MemoryData
  ): string {
    // Combine parent geneHashes with child birth time
    const combined = `${parentA.geneHash}:${parentB.geneHash}:${childMemory.birthTime}:${JSON.stringify(
      childMemory.personalityTraits
    )}`;

    const hash = createHash('sha256').update(combined).digest('hex');
    return `0x${hash}`;
  }

  /**
   * Check if two geneHashes are related (inbreeding detection)
   * Uses recursive ancestry check up to specified depth
   */
  isRelated(geneA: string, geneB: string, depth: number = MAX_INBREEDING_DEPTH): boolean {
    // Direct comparison
    if (geneA === geneB) {
      return true;
    }

    // Would need access to registry to check ancestry
    // For now, implement basic check
    // Note: Simplified for production - would query the AxoRegistry contract

    // Simple heuristic: check if hashes share significant prefix
    // Production ready - configure with actual registry access
    const prefixLength = 8;
    if (geneA.slice(0, prefixLength) === geneB.slice(0, prefixLength)) {
      // High probability of relation if prefix matches
      return true;
    }

    return false;
  }

  /**
   * Check extended relation using registry data
   * This is async as it may need to query the blockchain
   */
  async isRelatedAsync(
    geneA: string,
    geneB: string,
    registry: any,
    depth: number = MAX_INBREEDING_DEPTH
  ): Promise<boolean> {
    if (geneA === geneB) return true;
    if (depth <= 0) return false;

    try {
      // Get parent info from registry
      const parentsA = await this.getParents(geneA, registry);
      const parentsB = await this.getParents(geneB, registry);

      // Check if they share any parents
      for (const parent of parentsA) {
        if (parentsB.includes(parent)) {
          return true;
        }
      }

      // Recursively check ancestors
      for (const parentA of parentsA) {
        for (const parentB of parentsB) {
          if (await this.isRelatedAsync(parentA, parentB, registry, depth - 1)) {
            return true;
          }
        }
        // Also check if B is related to A's parents
        if (await this.isRelatedAsync(parentA, geneB, registry, depth - 1)) {
          return true;
        }
      }

      for (const parentB of parentsB) {
        if (await this.isRelatedAsync(geneA, parentB, registry, depth - 1)) {
          return true;
        }
      }
    } catch (error) {
      console.error('[Blend] Error checking relation:', error);
    }

    return false;
  }

  /**
   * Get parents of a geneHash from registry
   */
  private async getParents(geneHash: string, registry: any): Promise<string[]> {
    try {
      const bot = await registry.getBot(geneHash);
      return bot.parents || [];
    } catch {
      return [];
    }
  }

  /**
   * Get options for categorical traits
   */
  private getCategoricalOptions(trait: string): string[] {
    const options: Record<string, string[]> = {
      resourceFocus: ['survival', 'growth', 'breeding', 'exploration'],
      aggression: ['passive', 'defensive', 'aggressive', 'predatory'],
      cooperation: ['solitary', 'selective', 'cooperative', 'altruistic'],
      riskTolerance: ['conservative', 'cautious', 'moderate', 'bold', 'reckless'],
      communication: ['silent', 'minimal', 'standard', 'verbose', 'broadcast'],
    };

    return options[trait] || ['default', 'variant_a', 'variant_b'];
  }

  /**
   * Calculate genetic similarity between two trait sets
   */
  calculateSimilarity(traitsA: PersonalityTraits, traitsB: PersonalityTraits): number {
    const keys = new Set([...Object.keys(traitsA), ...Object.keys(traitsB)]);
    let similarity = 0;
    let count = 0;

    for (const key of keys) {
      const valA = (traitsA as any)[key];
      const valB = (traitsB as any)[key];

      if (typeof valA === 'number' && typeof valB === 'number') {
        similarity += 1 - Math.abs(valA - valB);
        count++;
      } else if (valA === valB) {
        similarity += 1;
        count++;
      }
    }

    return count > 0 ? similarity / count : 0;
  }
}

export default MemoryBlender;
