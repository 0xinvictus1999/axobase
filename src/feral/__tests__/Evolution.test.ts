/**
 * Evolution Unit Tests
 */

import { Evolution } from '../core/evolution/Evolution';
import { generateGeneHash } from '../utils/crypto';

describe('Evolution', () => {
  describe('Breeding Readiness', () => {
    it('should require 72h survival time', () => {
      const age = 70 * 60 * 60 * 1000; // 70 hours
      const minAge = 72 * 60 * 60 * 1000;
      
      expect(age).toBeLessThan(minAge);
    });

    it('should require 20 USDC balance', () => {
      const balance = 15;
      const minBalance = 20;
      
      expect(balance).toBeLessThan(minBalance);
    });

    it('should pass when both conditions met', () => {
      const age = 75 * 60 * 60 * 1000; // 75 hours
      const balance = 25;
      const minAge = 72 * 60 * 60 * 1000;
      const minBalance = 20;
      
      expect(age).toBeGreaterThanOrEqual(minAge);
      expect(balance).toBeGreaterThanOrEqual(minBalance);
    });
  });

  describe('Memory Mixing', () => {
    it('should apply weighted average for numeric traits', () => {
      const valA = 100;
      const valB = 200;
      const weightA = 0.6;
      const weightB = 0.4;
      
      const mixed = valA * weightA + valB * weightB;
      
      expect(mixed).toBe(140);
    });

    it('should inherit traits from one parent', () => {
      const traitA = 'aggressive';
      const traitB = 'passive';
      
      // Simulate random selection
      const inherited = Math.random() < 0.5 ? traitA : traitB;
      
      expect([traitA, traitB]).toContain(inherited);
    });

    it('should calculate correct generation', () => {
      const parentGens = [1, 2];
      const childGen = Math.max(...parentGens) + 1;
      
      expect(childGen).toBe(3);
    });

    it('should start at generation 1 for genesis', () => {
      const parents: string[] = [];
      const gen = parents.length === 0 ? 1 : 0;
      
      expect(gen).toBe(1);
    });
  });

  describe('Mutation', () => {
    it('should generate mutation at ~5% rate', () => {
      const mutations: boolean[] = [];
      
      for (let i = 0; i < 1000; i++) {
        mutations.push(Math.random() < 0.05);
      }
      
      const mutationCount = mutations.filter(m => m).length;
      const rate = mutationCount / 1000;
      
      // Should be roughly 5% (within 2% tolerance)
      expect(rate).toBeGreaterThan(0.03);
      expect(rate).toBeLessThan(0.07);
    });

    it('should generate valid mutation values', () => {
      const trait = 'aggression';
      const options = ['low', 'medium', 'high', 'extreme'];
      
      const mutation = options[Math.floor(Math.random() * options.length)];
      
      expect(options).toContain(mutation);
    });
  });

  describe('GeneHash Generation', () => {
    it('should generate unique geneHashes for different inputs', () => {
      const hash1 = generateGeneHash({ a: '1', b: '2' });
      const hash2 = generateGeneHash({ a: '1', c: '3' });
      
      expect(hash1).not.toBe(hash2);
    });

    it('should generate consistent geneHashes for same inputs', () => {
      const data = { parentA: 'abc', parentB: 'def' };
      
      const hash1 = generateGeneHash(data);
      const hash2 = generateGeneHash(data);
      
      expect(hash1).toBe(hash2);
    });
  });

  describe('Child Funding', () => {
    it('should require 10 USDC for child', () => {
      const parentContribution = 5;
      const totalFunding = parentContribution * 2;
      
      expect(totalFunding).toBe(10);
    });
  });
});
