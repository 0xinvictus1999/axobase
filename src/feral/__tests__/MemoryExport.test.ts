/**
 * MemoryExport Unit Tests
 */

import { MemoryExport } from '../core/export/MemoryExport';
import { promises as fs } from 'fs';
import { join } from 'path';
import { generateMerkleRoot, deriveWalletPath } from '../utils/crypto';

describe('MemoryExport', () => {
  const testDir = join(__dirname, 'test-memory');
  const outputDir = join(__dirname, 'test-exports');
  
  beforeAll(async () => {
    // Create test memory directory
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(outputDir, { recursive: true });
    
    // Create test memory files
    await fs.writeFile(join(testDir, 'SOUL.md'), '# Test Soul\nTest content');
    await fs.writeFile(join(testDir, 'MEMORY.md'), '# Test Memory\nMemory data');
    
    // Create subdirectory
    await fs.mkdir(join(testDir, 'thoughts'), { recursive: true });
    await fs.writeFile(join(testDir, 'thoughts', 'day1.md'), 'Day 1 thought');
  });

  afterAll(async () => {
    // Cleanup
    try {
      await fs.rm(testDir, { recursive: true });
      await fs.rm(outputDir, { recursive: true });
    } catch {}
  });

  beforeEach(async () => {
    // Remove export marker if exists
    try {
      await fs.unlink(join(testDir, '.FERAL_EXPORTED'));
    } catch {}
  });

  describe('calculateMerkleRoot', () => {
    it('should generate consistent merkle root', async () => {
      const exporter = new MemoryExport({
        agentName: 'test',
        memoryDir: testDir,
        gpgPublicKey: 'test-key',
        outputDir,
      });

      // Access private method for testing
      const root1 = await (exporter as any).calculateMerkleRoot(testDir);
      const root2 = await (exporter as any).calculateMerkleRoot(testDir);

      expect(root1).toBe(root2);
      expect(root1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate different root for different content', async () => {
      const exporter = new MemoryExport({
        agentName: 'test',
        memoryDir: testDir,
        gpgPublicKey: 'test-key',
        outputDir,
      });

      const root1 = await (exporter as any).calculateMerkleRoot(testDir);
      
      // Modify a file
      await fs.writeFile(join(testDir, 'SOUL.md'), '# Modified Soul');
      const root2 = await (exporter as any).calculateMerkleRoot(testDir);

      expect(root1).not.toBe(root2);
    });
  });

  describe('generateMerkleRoot utility', () => {
    it('should compute merkle root from leaves', () => {
      const leaves = ['a', 'b', 'c', 'd'];
      const root = generateMerkleRoot(leaves);

      expect(root).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle empty array', () => {
      const root = generateMerkleRoot([]);
      expect(root).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle single leaf', () => {
      const root = generateMerkleRoot(['single']);
      expect(root).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should be deterministic', () => {
      const leaves = ['a', 'b', 'c'];
      const root1 = generateMerkleRoot(leaves);
      const root2 = generateMerkleRoot(leaves);

      expect(root1).toBe(root2);
    });
  });

  describe('exportMemory', () => {
    it('should prevent double export', async () => {
      const exporter = new MemoryExport({
        agentName: 'test-agent',
        memoryDir: testDir,
        gpgPublicKey: 'test-key',
        outputDir,
      });

      // Mark as already exported
      await fs.writeFile(join(testDir, '.FERAL_EXPORTED'), '{}');

      await expect(exporter.exportMemory()).rejects.toThrow('already exported');
    });
  });

  describe('deriveWalletPath', () => {
    it('should generate valid HD path', () => {
      const geneHash = 'abcd1234efgh5678';
      const path = deriveWalletPath(geneHash);

      expect(path).toMatch(/^m\/44'\/60'\/0'\/0\/\d+$/);
    });
  });
});
