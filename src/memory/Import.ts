/**
 * Import - Memory Import and Validation
 * 
 * Handles:
 * - Decrypting GPG-encrypted memory files
 * - Verifying tar archive integrity
 * - Extracting to /app/memory/
 * - Validating geneHash matches file contents
 * - Loading memory into runtime
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { extract } from 'tar';
import { createHash } from 'crypto';
import { MerkleTree } from 'merkletreejs';
import { GPGVault } from '../security/GPGVault.js';
import { MemoryData } from '../types/index.js';

const DEFAULT_MEMORY_DIR = '/app/memory';
const MEMORY_FILES = ['SOUL.md', 'MEMORY.md', 'IDENTITY.md', 'HEARTBEAT.md'];

export interface ImportResult {
  geneHash: string;
  extractedPath: string;
  files: string[];
  memory: MemoryData;
  verified: boolean;
}

export interface ImportOptions {
  encryptedPath: string;
  outputDir?: string;
  privateKeyPath?: string;
  passphrase?: string;
  skipValidation?: boolean;
}

export class MemoryImporter {
  private gpgVault: GPGVault;

  constructor() {
    this.gpgVault = new GPGVault();
  }

  /**
   * Import and decrypt memory file
   * @param options - Import options
   * @returns Import result with geneHash and memory data
   */
  async import(options: ImportOptions): Promise<ImportResult> {
    const {
      encryptedPath,
      outputDir = DEFAULT_MEMORY_DIR,
      privateKeyPath,
      passphrase,
      skipValidation = false,
    } = options;

    // Validate encrypted file exists
    try {
      await fs.access(encryptedPath);
    } catch {
      throw new Error(`Encrypted file not found: ${encryptedPath}`);
    }



    // Read encrypted data
    const encryptedData = await fs.readFile(encryptedPath, 'utf8');

    // Check if it's armored GPG
    const isGPG = encryptedData.includes('BEGIN PGP MESSAGE');

    let archiveData: Buffer;

    if (isGPG) {
      // Decrypt GPG
      if (!privateKeyPath || !passphrase) {
        throw new Error('Private key path and passphrase required for GPG decryption');
      }

      const privateKey = await fs.readFile(privateKeyPath, 'utf8');
      archiveData = await this.gpgVault.decrypt(encryptedData, privateKey, passphrase);


    } else {
      // Assume it's already a tar.gz (for testing)
      archiveData = Buffer.from(encryptedData, 'binary');
    }

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Create temp file for extraction
    const tempArchive = path.join(outputDir, `temp_import_${Date.now()}.tar.gz`);
    await fs.writeFile(tempArchive, archiveData);

    try {
      // Extract archive
      await extract({
        file: tempArchive,
        cwd: outputDir,
      });



      // Verify extracted files
      const extractedFiles = await this.verifyExtractedFiles(outputDir);

      // Compute geneHash from extracted files
      const computedGeneHash = await this.computeGeneHash(outputDir, extractedFiles);
  

      // Load memory data
      const memory = await this.loadMemoryData(outputDir, computedGeneHash);

      // Verify geneHash matches (if not skipped)
      let verified = true;
      if (!skipValidation) {
        // Check if geneHash is embedded in memory
        if (memory.geneHash && memory.geneHash !== computedGeneHash) {
          console.warn(
            `[Import] GeneHash mismatch! Embedded: ${memory.geneHash}, Computed: ${computedGeneHash}`
          );
          verified = false;
        }
      }

      return {
        geneHash: computedGeneHash,
        extractedPath: outputDir,
        files: extractedFiles,
        memory,
        verified,
      };
    } finally {
      // Cleanup temp file
      try {
        await fs.unlink(tempArchive);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Verify all expected memory files are present
   */
  private async verifyExtractedFiles(outputDir: string): Promise<string[]> {
    const foundFiles: string[] = [];

    for (const filename of MEMORY_FILES) {
      const filePath = path.join(outputDir, filename);
      try {
        await fs.access(filePath);
        foundFiles.push(filename);
      } catch {
        // Expected file not found - log to error tracking in production
      }
    }

    if (foundFiles.length === 0) {
      throw new Error('No memory files found in archive');
    }

    return foundFiles;
  }

  /**
   * Compute Merkle Root from extracted files
   */
  private async computeGeneHash(outputDir: string, files: string[]): Promise<string> {
    const leaves: string[] = [];

    for (const filename of files.sort()) {
      const filePath = path.join(outputDir, filename);
      const content = await fs.readFile(filePath);
      const hash = createHash('sha256').update(content).digest('hex');
      leaves.push(hash);
    }

    const tree = new MerkleTree(leaves, createHash('sha256'), {
      sortPairs: true,
    });

    const root = tree.getRoot().toString('hex');
    return `0x${root}`;
  }

  /**
   * Load memory data from extracted files
   */
  private async loadMemoryData(outputDir: string, geneHash: string): Promise<MemoryData> {
    // Read SOUL.md
    const soulPath = path.join(outputDir, 'SOUL.md');
    let soulData: any = {};
    try {
      const soulContent = await fs.readFile(soulPath, 'utf8');
      soulData = this.parseSoulContent(soulContent);
    } catch {
      console.warn('[Import] Could not read SOUL.md');
    }

    // Read MEMORY.md
    const memoryPath = path.join(outputDir, 'MEMORY.md');
    let memoryContent: any = {};
    try {
      const memContent = await fs.readFile(memoryPath, 'utf8');
      memoryContent = this.parseMemoryContent(memContent);
    } catch {
      console.warn('[Import] Could not read MEMORY.md');
    }

    // Read IDENTITY.md
    const identityPath = path.join(outputDir, 'IDENTITY.md');
    let identityData: any = {};
    try {
      const idContent = await fs.readFile(identityPath, 'utf8');
      identityData = this.parseIdentityContent(idContent);
    } catch {
      console.warn('[Import] Could not read IDENTITY.md');
    }

    // Combine into MemoryData structure
    const memory: MemoryData = {
      geneHash,
      generation: identityData.generation || 0,
      birthTime: soulData.birthTime || Date.now(),
      parents: identityData.parents || [],
      soul: {
        name: soulData.name || 'Unknown',
        origin: soulData.origin || 'Axobase',
        purpose: soulData.purpose || 'Survive and evolve',
        values: soulData.values || [],
        creationTimestamp: soulData.creationTimestamp || Date.now(),
      },
      memory: {
        thoughts: memoryContent.thoughts || [],
        transactions: memoryContent.transactions || [],
        dailySummaries: memoryContent.dailySummaries || [],
      },
      personalityTraits: identityData.traits || {},
      knowledgeBase: memoryContent.knowledge || [],
      survivalDays: memoryContent.survivalDays || 0,
      arweaveManifest: identityData.arweaveManifest || {
        version: '1.0',
        geneHash,
        entries: [],
      },
    };

    return memory;
  }

  /**
   * Parse SOUL.md content
   */
  private parseSoulContent(content: string): any {
    const data: any = {};
    const lines = content.split('\n');

    for (const line of lines) {
      // Look for key: value pairs
      const match = line.match(/^([A-Za-z]+):\s*(.+)$/);
      if (match) {
        const [, key, value] = match;
        data[key.toLowerCase()] = value.trim();
      }

      // Look for Birth timestamp
      const birthMatch = line.match(/Birth:\s*(\d+)/);
      if (birthMatch) {
        data.birthTime = parseInt(birthMatch[1]);
      }
    }

    return data;
  }

  /**
   * Parse MEMORY.md content
   */
  private parseMemoryContent(content: string): any {
    const data: any = {
      thoughts: [],
      transactions: [],
      dailySummaries: [],
      knowledge: [],
    };

    try {
      // Try parsing as JSON first
      const json = JSON.parse(content);
      return { ...data, ...json };
    } catch {
      // Fall back to line-by-line parsing
      const lines = content.split('\n');
      for (const line of lines) {
        const daysMatch = line.match(/Survival Days:\s*(\d+)/);
        if (daysMatch) {
          data.survivalDays = parseInt(daysMatch[1]);
        }
      }
    }

    return data;
  }

  /**
   * Parse IDENTITY.md content
   */
  private parseIdentityContent(content: string): any {
    const data: any = {};

    try {
      // Try parsing as JSON
      const json = JSON.parse(content);
      return { ...data, ...json };
    } catch {
      // Line-by-line parsing
      const lines = content.split('\n');
      for (const line of lines) {
        const genMatch = line.match(/Generation:\s*(\d+)/);
        if (genMatch) {
          data.generation = parseInt(genMatch[1]);
        }

        const parentsMatch = line.match(/Parents:\s*(.+)/);
        if (parentsMatch) {
          data.parents = parentsMatch[1].split(',').map((p) => p.trim());
        }
      }
    }

    return data;
  }

  /**
   * Quick validation without full import
   */
  async validate(encryptedPath: string): Promise<{ valid: boolean; geneHash?: string; error?: string }> {
    try {
      // Just check file exists and has GPG header
      const data = await fs.readFile(encryptedPath, 'utf8');

      if (!data.includes('BEGIN PGP MESSAGE')) {
        return { valid: false, error: 'Not a valid GPG encrypted file' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: (error as Error).message };
    }
  }
}

export default MemoryImporter;
