/**
 * Cryptographic Utilities
 */

import { createHash, randomBytes } from 'crypto';

/**
 * Generate Merkle Root from leaf data
 */
export function generateMerkleRoot(leaves: string[]): string {
  if (leaves.length === 0) {
    return createHash('sha256').update('').digest('hex');
  }

  // Hash all leaves
  let hashes = leaves.map(leaf => 
    createHash('sha256').update(leaf).digest('hex')
  );

  // Build tree
  while (hashes.length > 1) {
    const nextLevel: string[] = [];
    
    // Pad if odd
    if (hashes.length % 2 === 1) {
      hashes.push(hashes[hashes.length - 1]);
    }

    for (let i = 0; i < hashes.length; i += 2) {
      const combined = hashes[i] + hashes[i + 1];
      nextLevel.push(createHash('sha256').update(combined).digest('hex'));
    }

    hashes = nextLevel;
  }

  return hashes[0];
}

/**
 * Generate unique GeneHash from memory data
 */
export function generateGeneHash(memoryData: Record<string, string>): string {
  const sorted = Object.keys(memoryData).sort();
  const leaves = sorted.map(key => `${key}:${memoryData[key]}`);
  return generateMerkleRoot(leaves);
}

/**
 * Generate cryptographically secure random bytes
 */
export function generateRandomBytes(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Hash file content
 */
export function hashContent(content: Buffer | string): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Derive wallet path from geneHash for HD wallet
 * path: m/44'/60'/0'/0/${geneHash-derived-index}
 */
export function deriveWalletPath(geneHash: string): string {
  // Use first 8 chars of geneHash as derivation index
  const index = parseInt(geneHash.slice(0, 8), 16) % 2147483647; // Max uint31
  return `m/44'/60'/0'/0/${index}`;
}
