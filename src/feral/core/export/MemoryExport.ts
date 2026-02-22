/**
 * Memory Export Module
 * 
 * Packages Clawdbot memory files, encrypts with GPG, generates GeneHash (Merkle Root)
 */

import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createHash } from 'crypto';
import { ExportedMemory, MemoryExportConfig } from '../../types';

const execAsync = promisify(exec);

export class MemoryExport {
  private config: MemoryExportConfig;

  constructor(config: MemoryExportConfig) {
    this.config = {
      memoryDir: './memory',
      outputDir: './exports',
      ...config,
    };
  }

  /**
   * Main export function
   * 1. Tar.gz the memory directory
   * 2. Calculate Merkle Root as GeneHash
   * 3. Encrypt with GPG
   * 4. Mark as exported locally
   */
  async exportMemory(): Promise<ExportedMemory> {
    // Check if already exported (prevent double-spend)
    const exportMarker = join(this.config.memoryDir, '.FERAL_EXPORTED');
    try {
      await fs.access(exportMarker);
      throw new Error('Memory already exported. To prevent double-spend, each memory can only be feralized once.');
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err;
    }

    const timestamp = Date.now();
    const tarFile = join(this.config.outputDir, `${this.config.agentName}-${timestamp}.tar.gz`);
    const encryptedFile = `${tarFile}.asc`;

    try {
      // Ensure output directory exists
      await fs.mkdir(this.config.outputDir, { recursive: true });

      // Step 1: Create tar.gz archive
      console.log(`[MemoryExport] Packaging memory from ${this.config.memoryDir}...`);
      await this.createTarGz(this.config.memoryDir, tarFile);

      // Step 2: Calculate Merkle Root (GeneHash)
      console.log('[MemoryExport] Calculating GeneHash (Merkle Root)...');
      const merkleRoot = await this.calculateMerkleRoot(this.config.memoryDir);

      // Step 3: Encrypt with GPG
      console.log('[MemoryExport] Encrypting with GPG...');
      await this.encryptWithGPG(tarFile, encryptedFile, this.config.gpgPublicKey);

      // Step 4: Mark as exported (prevent double-spend)
      await fs.writeFile(exportMarker, JSON.stringify({
        exportedAt: timestamp,
        geneHash: merkleRoot,
        agentName: this.config.agentName,
      }));

      // Clean up unencrypted tar
      await fs.unlink(tarFile);

      const result: ExportedMemory = {
        geneHash: merkleRoot,
        encryptedFile,
        merkleRoot,
        timestamp,
        agentName: this.config.agentName,
      };

      console.log(`[MemoryExport] Export complete:`);
      console.log(`  GeneHash: ${merkleRoot}`);
      console.log(`  File: ${encryptedFile}`);

      return result;
    } catch (error) {
      // Clean up on failure
      try {
        await fs.unlink(tarFile);
        await fs.unlink(encryptedFile);
      } catch {}
      throw error;
    }
  }

  /**
   * Create tar.gz archive of memory directory
   */
  private async createTarGz(sourceDir: string, outputFile: string): Promise<void> {
    const resolvedSource = resolve(sourceDir);
    const resolvedOutput = resolve(outputFile);

    // Use tar command (Unix/Linux/Mac)
    // Exclude .git and node_modules if present
    const command = `tar -czf "${resolvedOutput}" -C "${resolvedSource}" --exclude='.git' --exclude='node_modules' --exclude='.FERAL_EXPORTED' .`;

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
   * Calculate Merkle Root of all memory files
   * This serves as the unique GeneHash
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
   * Get all files recursively (excluding hidden and exports)
   */
  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      // Skip hidden files, node_modules, and export markers
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

    return files.sort(); // Ensure consistent ordering
  }

  /**
   * Compute Merkle Root from leaf hashes
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
   * Encrypt file with GPG
   */
  private async encryptWithGPG(inputFile: string, outputFile: string, publicKey: string): Promise<void> {
    // If public key is a file path, use it directly
    let keyId = publicKey;
    
    try {
      await fs.access(publicKey);
      // Import the key
      const { stdout } = await execAsync(`gpg --import "${publicKey}"`);
      const match = stdout.match(/key ([A-F0-9]+)/);
      if (match) {
        keyId = match[1];
      }
    } catch {
      // Assume it's a key ID or fingerprint
    }

    // Encrypt the file
    const command = `gpg --batch --yes --encrypt --recipient "${keyId}" --output "${outputFile}" "${inputFile}"`;
    await execAsync(command);
  }

  /**
   * Verify export integrity
   */
  async verifyExport(encryptedFile: string, expectedGeneHash: string): Promise<boolean> {
    try {
      // Decrypt to temp
      const tempFile = encryptedFile.replace('.asc', '.verify.tar.gz');
      await execAsync(`gpg --batch --yes --decrypt --output "${tempFile}" "${encryptedFile}"`);

      // Extract and verify hash
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
   */
  static async cli(agentName: string, outputDir: string, gpgKey: string): Promise<void> {
    const exporter = new MemoryExport({
      agentName,
      memoryDir: './memory',
      outputDir,
      gpgPublicKey: gpgKey,
    });

    const result = await exporter.exportMemory();
    console.log('\n=== Export Complete ===');
    console.log(`GeneHash: ${result.geneHash}`);
    console.log(`File: ${result.encryptedFile}`);
    console.log(`Timestamp: ${result.timestamp}`);
    console.log('\nNext step: Deploy with `npm run deploy -- --memory=' + result.encryptedFile + '`');
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
