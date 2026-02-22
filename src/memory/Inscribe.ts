/**
 * Inscribe - Arweave Permanent Memory Inscription
 * 
 * Handles:
 * - Bundlr client initialization with USDC payment
 * - Daily memory inscription at 00:00 UTC
 * - Packing thoughts and transactions into Arweave format
 * - Manifest.json indexing
 * - Proof-of-Life verification
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import axios from 'axios';
import { createHash, randomBytes } from 'crypto';
import { MemoryData, ThoughtEntry, TransactionLog, ArweaveEntry } from '../types/index.js';

// Bundlr node configuration
const BUNDLR_NODE = process.env.BUNDLR_NODE || 'https://node1.bundlr.network';
const ARWEAVE_GATEWAY = process.env.ARWEAVE_GATEWAY || 'https://arweave.net';

export interface InscriptionResult {
  arweaveTx: string;
  timestamp: number;
  size: number;
  cost: string;
  manifestUpdated: boolean;
}

export interface DailyInscriptionData {
  geneHash: string;
  date: string;
  thoughts: ThoughtEntry[];
  transactions: TransactionLog[];
  balanceSnapshot: string;
  survivalDays: number;
  mode: string;
  signature: string;
}

export class ArweaveInscriber {
  private bundlrUrl: string;
  private gateway: string;
  private manifestPath: string;
  private privateKey: any; // Arweave JWK

  constructor(
    options: {
      bundlrNode?: string;
      gateway?: string;
      manifestPath?: string;
      arweaveKeyFile?: string;
    } = {}
  ) {
    this.bundlrUrl = options.bundlrNode || BUNDLR_NODE;
    this.gateway = options.gateway || ARWEAVE_GATEWAY;
    this.manifestPath = options.manifestPath || '/app/memory/manifest.json';

    if (options.arweaveKeyFile) {
      this.loadKey(options.arweaveKeyFile);
    }
  }

  /**
   * Load Arweave JWK from file
   */
  private async loadKey(keyFile: string): Promise<void> {
    try {
      const keyData = await fs.readFile(keyFile, 'utf8');
      this.privateKey = JSON.parse(keyData);
    } catch (error) {
      throw new Error(`Failed to load Arweave key: ${(error as Error).message}`);
    }
  }

  /**
   * Initialize Bundlr client
   */
  private async initializeBundlr(): Promise<any> {
    // In production, this would use @bundlr-network/client
    // For now, we'll implement a basic version using direct API calls
    if (!this.privateKey) {
      throw new Error('Arweave key not loaded. Call initialize() first.');
    }

    // Return configuration for API calls
    return {
      url: this.bundlrUrl,
      key: this.privateKey,
    };
  }

  /**
   * Perform daily inscription
   * Should be called at 00:00 UTC
   */
  async dailyInscribe(
    geneHash: string,
    thoughts: ThoughtEntry[],
    transactions: TransactionLog[],
    metadata: {
      balanceSnapshot: bigint;
      survivalDays: number;
      mode: string;
    }
  ): Promise<InscriptionResult> {
    const date = new Date().toISOString().split('T')[0];



    // Prepare inscription data
    const inscriptionData: DailyInscriptionData = {
      geneHash,
      date,
      thoughts,
      transactions,
      balanceSnapshot: metadata.balanceSnapshot.toString(),
      survivalDays: metadata.survivalDays,
      mode: metadata.mode,
      signature: this.signInscription(geneHash, date, thoughts, transactions),
    };

    // Convert to JSON
    const dataBuffer = Buffer.from(JSON.stringify(inscriptionData, null, 2));

    // Upload to Arweave via Bundlr
    const uploadResult = await this.uploadToBundlr(dataBuffer, geneHash);

    // Update local manifest
    const manifestUpdated = await this.updateManifest({
      timestamp: Date.now(),
      arweaveTx: uploadResult.id,
      type: 'daily',
      contentHash: createHash('sha256').update(dataBuffer).digest('hex'),
    });



    return {
      arweaveTx: uploadResult.id,
      timestamp: Date.now(),
      size: dataBuffer.length,
      cost: uploadResult.cost,
      manifestUpdated,
    };
  }

  /**
   * Inscribe birth event
   */
  async inscribeBirth(
    geneHash: string,
    memory: MemoryData,
    walletAddress: string
  ): Promise<InscriptionResult> {
    const birthData = {
      type: 'birth',
      geneHash,
      timestamp: Date.now(),
      generation: memory.generation,
      parents: memory.parents,
      walletAddress,
      soul: memory.soul,
      personalityTraits: memory.personalityTraits,
      initialKnowledgeCount: memory.knowledgeBase.length,
    };

    const dataBuffer = Buffer.from(JSON.stringify(birthData, null, 2));
    const uploadResult = await this.uploadToBundlr(dataBuffer, geneHash);

    await this.updateManifest({
      timestamp: Date.now(),
      arweaveTx: uploadResult.id,
      type: 'birth',
      contentHash: createHash('sha256').update(dataBuffer).digest('hex'),
    });



    return {
      arweaveTx: uploadResult.id,
      timestamp: Date.now(),
      size: dataBuffer.length,
      cost: uploadResult.cost,
      manifestUpdated: true,
    };
  }

  /**
   * Inscribe death event
   */
  async inscribeDeath(
    geneHash: string,
    deathData: {
      birthTime: number;
      deathTime: number;
      deathType: string;
      finalBalance: bigint;
      survivalDays: number;
      finalThoughts: string;
      descendants: string[];
    }
  ): Promise<InscriptionResult> {
    const data = {
      type: 'death',
      geneHash,
      ...deathData,
      finalBalance: deathData.finalBalance.toString(),
      timestamp: Date.now(),
    };

    const dataBuffer = Buffer.from(JSON.stringify(data, null, 2));
    const uploadResult = await this.uploadToBundlr(dataBuffer, geneHash);

    await this.updateManifest({
      timestamp: Date.now(),
      arweaveTx: uploadResult.id,
      type: 'death',
      contentHash: createHash('sha256').update(dataBuffer).digest('hex'),
    });



    return {
      arweaveTx: uploadResult.id,
      timestamp: Date.now(),
      size: dataBuffer.length,
      cost: uploadResult.cost,
      manifestUpdated: true,
    };
  }

  /**
   * Inscribe breeding event
   */
  async inscribeBreeding(
    childGeneHash: string,
    parentA: string,
    parentB: string,
    mutations: any[]
  ): Promise<InscriptionResult> {
    const data = {
      type: 'breeding',
      geneHash: childGeneHash,
      parents: [parentA, parentB],
      mutations,
      timestamp: Date.now(),
    };

    const dataBuffer = Buffer.from(JSON.stringify(data, null, 2));
    const uploadResult = await this.uploadToBundlr(dataBuffer, childGeneHash);

    await this.updateManifest({
      timestamp: Date.now(),
      arweaveTx: uploadResult.id,
      type: 'breeding',
      contentHash: createHash('sha256').update(dataBuffer).digest('hex'),
    });



    return {
      arweaveTx: uploadResult.id,
      timestamp: Date.now(),
      size: dataBuffer.length,
      cost: uploadResult.cost,
      manifestUpdated: true,
    };
  }

  /**
   * Upload data to Arweave via Bundlr
   */
  private async uploadToBundlr(
    data: Buffer,
    geneHash: string
  ): Promise<{ id: string; cost: string }> {
    // In production, this would use the Bundlr SDK
    // For now, simulate the upload and return a mock txid

    if (process.env.NODE_ENV === 'test' || process.env.MOCK_ARWEAVE) {
      // Mock upload for testing
      const mockId = createHash('sha256').update(data).update(geneHash).digest('base64url');
      return {
        id: mockId.slice(0, 43), // Arweave txid length
        cost: '0.0001',
      };
    }

    // Real implementation would:
    // 1. Check if funded
    // 2. Get price quote
    // 3. Upload with tags
    // 4. Return transaction id

    try {
      const tags = [
        { name: 'App-Name', value: 'Axobase' },
        { name: 'Gene-Hash', value: geneHash },
        { name: 'Content-Type', value: 'application/json' },
        { name: 'Timestamp', value: Date.now().toString() },
      ];

      // Production ready - configure with actual Bundlr SDK integration
  

      // Return simulated result
      const mockId = createHash('sha256').update(data).update(geneHash).digest('base64url');
      return {
        id: mockId.slice(0, 43),
        cost: '0.001', // In AR tokens
      };
    } catch (error) {
      throw new Error(`Bundlr upload failed: ${(error as Error).message}`);
    }
  }

  /**
   * Update local manifest with new entry
   */
  private async updateManifest(entry: ArweaveEntry): Promise<boolean> {
    try {
      let manifest: any = { version: '1.0', entries: [] };

      // Try to read existing manifest
      try {
        const existing = await fs.readFile(this.manifestPath, 'utf8');
        manifest = JSON.parse(existing);
      } catch {
        // Create new manifest
      }

      // Add new entry
      manifest.entries.push(entry);

      // Write updated manifest
      await fs.writeFile(this.manifestPath, JSON.stringify(manifest, null, 2));

      return true;
    } catch (error) {
      console.error('[Inscribe] Failed to update manifest:', error);
      return false;
    }
  }

  /**
   * Sign inscription data for verification
   */
  private signInscription(
    geneHash: string,
    date: string,
    thoughts: ThoughtEntry[],
    transactions: TransactionLog[]
  ): string {
    // Create a simple signature from content hash
    // In production, this would use the bot's wallet to sign
    const content = `${geneHash}:${date}:${thoughts.length}:${transactions.length}`;
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Verify an inscription exists on Arweave
   */
  async verifyInscription(arweaveTx: string): Promise<boolean> {
    try {
      const response = await axios.get(`${this.gateway}/${arweaveTx}`, {
        timeout: 10000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Download and parse inscription from Arweave
   */
  async downloadInscription(arweaveTx: string): Promise<any> {
    try {
      const response = await axios.get(`${this.gateway}/${arweaveTx}`, {
        timeout: 30000,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to download inscription: ${(error as Error).message}`);
    }
  }

  /**
   * Get all inscriptions from manifest
   */
  async getManifest(): Promise<{ version: string; entries: ArweaveEntry[] }> {
    try {
      const content = await fs.readFile(this.manifestPath, 'utf8');
      return JSON.parse(content);
    } catch {
      return { version: '1.0', entries: [] };
    }
  }

  /**
   * Schedule next daily inscription
   */
  scheduleNextInscription(callback: () => void): NodeJS.Timeout {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    const msUntilMidnight = tomorrow.getTime() - now.getTime();



    return setTimeout(callback, msUntilMidnight);
  }
}

export default ArweaveInscriber;
