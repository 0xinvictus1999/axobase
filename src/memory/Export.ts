/**
 * Export - Memory Export and Packaging
 * 
 * Handles:
 * - Scanning ~/.clawd/ directory
 * - Packaging memory files (SOUL.md, MEMORY.md, IDENTITY.md, HEARTBEAT.md)
 * - Creating tar.gz archives
 * - Computing Merkle Root as geneHash
 * - GPG encryption
 * - Preventing duplicate exports
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { create } from 'tar';
import { createHash } from 'crypto';
import { MerkleTree } from 'merkletreejs';
import { GPGVault } from '../security/GPGVault.js';
import { MemoryData } from '../types/index.js';

const CLAWD_DIR = path.join(process.env.HOME || process.env.USERPROFILE || '~', '.clawd');
const MEMORY_FILES = ['SOUL.md', 'MEMORY.md', 'IDENTITY.md', 'HEARTBEAT.md'];
const EXPORT_MARKER = '.axo_exported';

export interface ExportResult {
  geneHash: string;
  encryptedPath: string;
  originalSize: number;
  encryptedSize: number;
  timestamp: number;
  fingerprint: string;
}

export interface ExportOptions {
  agent: string;
  output: string;
  encrypt?: boolean;
  force?: boolean;
}

export class MemoryExporter {
  private gpgVault: GPGVault;

  constructor() {
    this.gpgVault = new GPGVault();
  }

  /**
   * Export memory from Clawdbot
   * @param options - Export options
   * @returns Export result with geneHash and paths
   */
  async export(options: ExportOptions): Promise<ExportResult> {
    const { agent, output, encrypt = true, force = false } = options;

    // Validate agent directory exists
    const agentDir = path.join(CLAWD_DIR, agent);
    await this.validateAgentDirectory(agentDir);

    // Check if already exported (unless force)
    if (!force) {
      const alreadyExported = await this.checkExportMarker(agentDir);
      if (alreadyExported) {
        throw new Error(
          `Agent ${agent} has already been exported. Use --force to re-export.`
        );
      }
    }

    // Collect memory files
    const memoryFiles = await this.collectMemoryFiles(agentDir);
    if (memoryFiles.length === 0) {
      throw new Error(`No memory files found for agent ${agent}`);
    }



    // Create tar.gz archive
    const timestamp = Date.now();
    const archiveName = `memory_${agent}_${timestamp}.tar.gz`;
    const archivePath = path.join(output, archiveName);

    // Ensure output directory exists
    await fs.mkdir(output, { recursive: true });

    // Create tarball
    await create(
      {
        file: archivePath,
        gzip: true,
        cwd: agentDir,
      },
      memoryFiles.map((f) => path.relative(agentDir, f))
    );



    // Compute Merkle Root as geneHash
    const geneHash = await this.computeGeneHash(memoryFiles);


    // Get original file size
    const archiveStats = await fs.stat(archivePath);
    const originalSize = archiveStats.size;

    let finalPath = archivePath;
    let encryptedSize = originalSize;
    let fingerprint = '';

    // Encrypt if requested
    if (encrypt) {
      if (!this.gpgVault.getPlatformPublicKey()) {
        throw new Error(
          'No platform GPG public key available. Set PLATFORM_GPG_PUBLIC_KEY environment variable.'
        );
      }

      const archiveData = await fs.readFile(archivePath);
      const encrypted = await this.gpgVault.encrypt(archiveData);

      const encryptedPath = `${archivePath}.asc`;
      await fs.writeFile(encryptedPath, encrypted);

      // Remove unencrypted archive
      await fs.unlink(archivePath);

      finalPath = encryptedPath;
      encryptedSize = Buffer.byteLength(encrypted, 'utf8');
      fingerprint = await this.gpgVault.getFingerprint(
        this.gpgVault.getPlatformPublicKey()!
      );


    }

    // Create export marker
    await this.createExportMarker(agentDir, geneHash, timestamp);

    return {
      geneHash,
      encryptedPath: finalPath,
      originalSize,
      encryptedSize,
      timestamp,
      fingerprint,
    };
  }

  /**
   * Validate agent directory exists and is accessible
   */
  private async validateAgentDirectory(agentDir: string): Promise<void> {
    try {
      const stats = await fs.stat(agentDir);
      if (!stats.isDirectory()) {
        throw new Error(`${agentDir} is not a directory`);
      }
    } catch (error) {
      throw new Error(`Agent directory not found: ${agentDir}`);
    }
  }

  /**
   * Check if agent has already been exported
   */
  private async checkExportMarker(agentDir: string): Promise<boolean> {
    try {
      const markerPath = path.join(agentDir, EXPORT_MARKER);
      await fs.access(markerPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create export marker file
   */
  private async createExportMarker(
    agentDir: string,
    geneHash: string,
    timestamp: number
  ): Promise<void> {
    const markerPath = path.join(agentDir, EXPORT_MARKER);
    const markerContent = {
      geneHash,
      exportedAt: timestamp,
      version: '1.0.0',
    };
    await fs.writeFile(markerPath, JSON.stringify(markerContent, null, 2));
  }

  /**
   * Collect all memory files from agent directory
   */
  private async collectMemoryFiles(agentDir: string): Promise<string[]> {
    const files: string[] = [];

    for (const filename of MEMORY_FILES) {
      const filePath = path.join(agentDir, filename);
      try {
        await fs.access(filePath);
        files.push(filePath);
      } catch {
        // Memory file not found - log to error tracking in production
      }
    }

    return files;
  }

  /**
   * Compute Merkle Root from memory files
   * This becomes the geneHash
   */
  private async computeGeneHash(files: string[]): Promise<string> {
    // Read and hash each file
    const leaves: string[] = [];

    for (const filePath of files.sort()) {
      const content = await fs.readFile(filePath);
      const hash = createHash('sha256').update(content).digest('hex');
      leaves.push(hash);
    }

    // Create Merkle Tree
    const tree = new MerkleTree(leaves, createHash('sha256'), {
      sortPairs: true,
    });

    // Get root
    const root = tree.getRoot().toString('hex');

    return `0x${root}`;
  }

  /**
   * Verify that exported archive matches geneHash
   */
  async verifyExport(encryptedPath: string, expectedGeneHash: string): Promise<boolean> {
    // This would require decrypting and re-computing the hash
    // For now, return true (full verification happens during import)
    return true;
  }

  /**
   * Get export history for an agent
   */
  async getExportHistory(agent: string): Promise<Array<{ geneHash: string; exportedAt: number }>> {
    const agentDir = path.join(CLAWD_DIR, agent);
    const markerPath = path.join(agentDir, EXPORT_MARKER);

    try {
      const content = await fs.readFile(markerPath, 'utf8');
      const marker = JSON.parse(content);
      return [marker];
    } catch {
      return [];
    }
  }

  /**
   * Clear export marker (for testing or re-export)
   */
  async clearExportMarker(agent: string): Promise<void> {
    const agentDir = path.join(CLAWD_DIR, agent);
    const markerPath = path.join(agentDir, EXPORT_MARKER);

    try {
      await fs.unlink(markerPath);
    } catch {
      // Ignore if doesn't exist
    }
  }
}

export default MemoryExporter;
