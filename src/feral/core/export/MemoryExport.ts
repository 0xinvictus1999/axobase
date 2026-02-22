/**
 * Memory Export Module
 * 
 * Handles exporting Clawdbot memory for feralization:
 * - Packages memory files into tar.gz archive
 * - Encrypts with GPG for secure transport
 * - Calculates Merkle Root as unique GeneHash
 * - Prevents double-export (double-spend protection)
 * 
 * @module MemoryExport
 */

import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createHash } from 'crypto';
import { ExportedMemory, MemoryExportConfig } from '../../types';

const execAsync = promisify(exec);

/**
 * Memory export class for preparing AI agent memories for axo deployment
 */
export class MemoryExport {
  private config: MemoryExportConfig;

  /**
   * Creates a new MemoryExport instance
   * @param config - Export configuration
   */
  constructor(config: MemoryExportConfig) {
    this.config = {
      memoryDir: './memory',
      outputDir: './exports',
      ...config,
    };
  }

  /**
   * Main export function
   * 
   * Workflow:
   * 1. Check for existing export (prevent double-spend)
   * 2. Create tar.gz archive of memory directory
   * 3. Calculate Merkle Root as GeneHash
   * 4. Encrypt with GPG
   * 5. Mark as exported
   * 
   * @returns Export result with geneHash and file path
   * @throws Error if already exported or GPG fails
   */
  async exportMemory(): Promise<ExportedMemory> {
    // Check for existing export (double-spend protection)
    const exportMarker = join(this.config.memoryDir, '.AXO_EXPORTED');
    try {
      await fs.access(exportMarker);
      throw new Error(
        'Memory already exported. To prevent double-spend, each memory can only be feralized once.'
      );
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err;
    }

    const timestamp = Date.now();
    const tarFile = join(this.config.outputDir, `${this.config.agentName}-${timestamp}.tar.gz`);
    const encryptedFile = `${tarFile}.asc`;

    try {
      // Ensure output directory exists
      await fs.mkdir(this.config.outputDir, { recursive: true });

      // Step 1: Create archive

      await this.createTarGz(this.config.memoryDir, tarFile);

      // Step 2: Calculate GeneHash (Merkle Root)

      const merkleRoot = await this.calculateMerkleRoot(this.config.memoryDir);

      // Step 3: Encrypt with GPG

      await this.encryptWithGPG(tarFile, encryptedFile, this.config.gpgPublicKey);

      // Step 4: Mark as exported
      await fs.writeFile(exportMarker, JSON.stringify({
        exportedAt: timestamp,
        geneHash: merkleRoot,
        agentName: this.config.agentName,
      }));

      // Clean up unencrypted archive
      await fs.unlink(tarFile);

      const result: ExportedMemory = {
        geneHash: merkleRoot,
        encryptedFile,
        merkleRoot,
        timestamp,
        agentName: this.config.agentName,
      };



      return result;
    } catch (error) {
      // Cleanup on failure
      try {
        await fs.unlink(tarFile);
        await fs.unlink(encryptedFile);
      } catch {}
      throw error;
    }
  }

  /**
   * Creates a tar.gz archive of the memory directory
   * @param sourceDir - Source directory to archive
   * @param outputFile - Output archive path
   */
  private async createTarGz(sourceDir: string, outputFile: string): Promise<void> {
    const resolvedSource = resolve(sourceDir);
    const resolvedOutput = resolve(outputFile);

    // Exclude .git, node_modules, and export markers
    const command = `tar -czf "${resolvedOutput}" -C "${resolvedSource}" --exclude='.git' --exclude='node_modules' --exclude='.AXO_EXPORTED' .`;

    try {
      await execAsync(command);
    } catch (error: any) {
      // Fallback to PowerShell on Windows
      if (process.platform === 'win32') {
        const psCommand = `Compress-Archive -Path "${resolvedSource}\\*" -DestinationPath "${resolvedOutput.replace('.gz', '.zip')}" -Force`;
        await execAsync(psCommand, { shell: 'powershell.exe' });
      } else {
        throw error;
      }
    }
  }

  /**
   * Calculates the Merkle Root of all memory files
   * This serves as the unique GeneHash for the agent
   * @param dir - Directory containing memory files
   * @returns Hex string of the Merkle Root
   */
  private async calculateMerkleRoot(dir: string): Promise<string> {
    const files = await this.getAllFiles(dir);
    const hashes: string[] = [];

    for (const file of files) {
      const content = await fs.readFile(file);
      const hash = createHash('sha256').update(content).digest('hex');
      hashes.push(hash);
    }

    return this.computeMerkleRoot(hashes);
  }

  /**
   * Recursively gets all files in a directory
   * Excludes hidden files and special directories
   * @param dir - Directory to scan
   * @returns Array of file paths
   */
  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      // Skip hidden files and special directories
      if (entry.name.startsWith('.') || 
          entry.name === 'node_modules' ||
          entry.name === 'exports') {
        continue;
      }

      if (entry.isDirectory()) {
        files.push(...await this.getAllFiles(fullPath));
      } else {
        files.push(fullPath);
      }
    }

    return files.sort(); // Consistent ordering for deterministic hashing
  }

  /**
   * Computes the Merkle Root from leaf hashes
   * @param hashes - Array of leaf hashes
   * @returns Merkle Root hash
   */
  private computeMerkleRoot(hashes: string[]): string {
    if (hashes.length === 0) {
      return createHash('sha256').update('').digest('hex');
    }

    if (hashes.length === 1) {
      return hashes[0];
    }

    // Pad to power of 2
    let level = [...hashes];
    while (level.length % 2 !== 0) {
      level.push(level[level.length - 1]);
    }

    // Build tree bottom-up
    while (level.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < level.length; i += 2) {
        const combined = level[i] + level[i + 1];
        const hash = createHash('sha256').update(combined).digest('hex');
        nextLevel.push(hash);
      }
      level = nextLevel;
    }

    return level[0];
  }

  /**
   * Encrypts a file using GPG
   * @param inputFile - File to encrypt
   * @param outputFile - Output encrypted file path
   * @param publicKey - GPG public key (file path or key ID)
   */
  private async encryptWithGPG(inputFile: string, outputFile: string, publicKey: string): Promise<void> {
    let keyId = publicKey;
    
    // Try to import key if it's a file
    try {
      await fs.access(publicKey);
      const { stdout } = await execAsync(`gpg --import "${publicKey}"`);
      const match = stdout.match(/key ([A-F0-9]+)/);
      if (match) {
        keyId = match[1];
      }
    } catch {
      // Assume it's already a key ID
    }

    // Encrypt
    const command = `gpg --batch --yes --encrypt --recipient "${keyId}" --output "${outputFile}" "${inputFile}"`;
    await execAsync(command);
  }

  /**
   * Verifies an export's integrity
   * @param encryptedFile - Path to encrypted file
   * @param expectedGeneHash - Expected gene hash
   * @returns Whether the export is valid
   */
  async verifyExport(encryptedFile: string, expectedGeneHash: string): Promise<boolean> {
    try {
      // Decrypt to temp
      const tempFile = encryptedFile.replace('.asc', '.verify.tar.gz');
      await execAsync(`gpg --batch --yes --decrypt --output "${tempFile}" "${encryptedFile}"`);

      // Extract and verify
      const extractDir = tempFile.replace('.tar.gz', '');
      await fs.mkdir(extractDir, { recursive: true });
      await execAsync(`tar -xzf "${tempFile}" -C "${extractDir}"`);

      const actualHash = await this.calculateMerkleRoot(extractDir);

      // Cleanup
      await execAsync(`rm -rf "${extractDir}" "${tempFile}"`);

      return actualHash === expectedGeneHash;
    } catch {
      return false;
    }
  }

  /**
   * CLI entry point
   * @param agentName - Agent name
   * @param outputDir - Output directory
   * @param gpgKey - GPG public key
   */
  static async cli(agentName: string, outputDir: string, gpgKey: string): Promise<void> {
    const exporter = new MemoryExport({
      agentName,
      memoryDir: './memory',
      outputDir,
      gpgPublicKey: gpgKey,
    });

    const result = await exporter.exportMemory();

  }
}

// CLI handler
if (require.main === module) {
  const args = process.argv.slice(2);
  const agentArg = args.find(a => a.startsWith('--agent='));
  const outputArg = args.find(a => a.startsWith('--output='));
  const gpgArg = args.find(a => a.startsWith('--gpg-key='));

  if (!agentArg || !outputArg || !gpgArg) {
    console.error('Usage: ts-node MemoryExport.ts --agent=<name> --output=<dir> --gpg-key=<key>');
    process.exit(1);
  }

  MemoryExport.cli(
    agentArg.split('=')[1],
    outputArg.split('=')[1],
    gpgArg.split('=')[1]
  ).catch(console.error);
}
