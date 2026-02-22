/**
 * Arweave Inscriber Module
 * 
 * Daily memory inscription to Arweave:
 * - Bundle 24h of thoughts, transactions, survival state
 * - Upload via Bundlr Network (USDC payments)
 * - Git commit with ar:// reference
 * - Generate Proof-of-Life
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { DailyInscription, InscriptionContent, ArweaveConfig } from '../../types';

const execAsync = promisify(exec);

// Bundlr client (lazy loaded)
let Bundlr: any;

export class ArweaveInscriber {
  private config: ArweaveConfig;
  private memoryDir: string;
  private inscriptions: Map<number, DailyInscription> = new Map();
  private bundlrClient: any = null;

  constructor(config: ArweaveConfig, memoryDir: string = '/app/memory') {
    this.config = config;
    this.memoryDir = memoryDir;
  }

  /**
   * Initialize Bundlr client
   */
  async initialize(): Promise<void> {
    if (!Bundlr) {
      ({ default: Bundlr } = await import('@bundlr-network/client'));
    }

    // Initialize with USDC on Base
    this.bundlrClient = new Bundlr.default(
      this.config.bundlrNode,
      this.config.currency,
      this.config.privateKey,
      {
        providerUrl: process.env.BASE_RPC_URL,
      }
    );


  }

  /**
   * Daily inscription (run at 00:00 UTC)
   */
  async dailyInscribe(): Promise<DailyInscription> {


    const now = new Date();
    const dayNumber = await this.getDayNumber();

    // Collect content
    const content = await this.collectDailyContent();

    // Build inscription package
    const packageData = await this.buildInscriptionPackage(content, dayNumber);

    // Upload to Arweave via Bundlr
    const txId = await this.uploadToArweave(packageData);

    // Record inscription
    const inscription: DailyInscription = {
      timestamp: now.getTime(),
      dayNumber,
      arweaveTx: txId,
      content,
    };

    this.inscriptions.set(dayNumber, inscription);

    // Save local index
    await this.saveInscriptionIndex(inscription);

    // Git commit
    await this.gitCommit(inscription);



    return inscription;
  }

  /**
   * Schedule daily inscription at 00:00 UTC
   */
  scheduleDailyInscription(): void {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCHours(24, 0, 0, 0);

    const msUntilMidnight = tomorrow.getTime() - now.getTime();



    // First run at next midnight
    setTimeout(() => {
      this.dailyInscribe();
      
      // Then every 24 hours
      setInterval(() => {
        this.dailyInscribe();
      }, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
  }

  /**
   * Collect 24h of content
   */
  private async collectDailyContent(): Promise<InscriptionContent> {
    const last24h = Date.now() - 24 * 60 * 60 * 1000;

    // Read thoughts
    const thoughts = await this.readThoughts(last24h);

    // Read transactions
    const transactions = await this.readTransactions(last24h);

    // Read survival state
    const survivalStatus = await this.readSurvivalState();

    // Get geneHash and wallet from environment
    const geneHash = process.env.GENE_HASH || 'unknown';
    const walletAddress = process.env.WALLET_ADDRESS || 'unknown';

    return {
      thoughts,
      transactions,
      survivalStatus: {
        ...survivalStatus,
        lastCheck: Date.now(),
      },
      geneHash,
      walletAddress,
    };
  }

  /**
   * Read thoughts from memory
   */
  private async readThoughts(since: number): Promise<any[]> {
    try {
      const thoughtsPath = join(this.memoryDir, 'THOUGHTS.md');
      const content = await fs.readFile(thoughtsPath, 'utf-8');

      // Parse thoughts (simple parsing)
      const thoughts: any[] = [];
      const entries = content.split('## Thought -');

      for (const entry of entries.slice(1)) {
        const lines = entry.trim().split('\n');
        const timestamp = lines[0].trim();
        const ts = new Date(timestamp).getTime();

        if (ts >= since) {
          thoughts.push({
            timestamp: ts,
            content: entry.trim(),
          });
        }
      }

      return thoughts;
    } catch {
      return [];
    }
  }

  /**
   * Read transactions from memory
   */
  private async readTransactions(since: number): Promise<any[]> {
    try {
      const txPath = join(this.memoryDir, 'TRANSACTIONS.json');
      const content = await fs.readFile(txPath, 'utf-8');
      const txs = JSON.parse(content);

      return txs.filter((tx: any) => tx.timestamp >= since);
    } catch {
      return [];
    }
  }

  /**
   * Read survival state
   */
  private async readSurvivalState(): Promise<any> {
    try {
      const statePath = join(this.memoryDir, 'SURVIVAL_STATE.json');
      const content = await fs.readFile(statePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {
        mode: 'unknown',
        usdcBalance: 0,
        ethBalance: 0,
      };
    }
  }

  /**
   * Build inscription package
   */
  private async buildInscriptionPackage(
    content: InscriptionContent,
    dayNumber: number
  ): Promise<Buffer> {
    const packageData = {
      version: '1.0',
      protocol: 'axobase-memory',
      dayNumber,
      timestamp: Date.now(),
      geneHash: content.geneHash,
      walletAddress: content.walletAddress,
      content: {
        thoughtCount: content.thoughts.length,
        transactionCount: content.transactions.length,
        survivalStatus: content.survivalStatus,
      },
      thoughts: content.thoughts,
      transactions: content.transactions,
    };

    return Buffer.from(JSON.stringify(packageData, null, 2));
  }

  /**
   * Upload to Arweave via Bundlr
   */
  private async uploadToArweave(data: Buffer): Promise<string> {
    if (!this.bundlrClient) {
      await this.initialize();
    }

    // Check balance and fund if needed
    const balance = await this.bundlrClient.getLoadedBalance();
    const price = await this.bundlrClient.getPrice(data.length);

    if (balance.lt(price)) {

      await this.bundlrClient.fund(price.mul(2)); // Fund 2x for future
    }

    // Upload
    const tags = [
      { name: 'Content-Type', value: 'application/json' },
      { name: 'Protocol', value: 'axobase-memory' },
      { name: 'Gene-Hash', value: process.env.GENE_HASH || 'unknown' },
    ];

    const response = await this.bundlrClient.upload(data, { tags });
    return response.id;
  }

  /**
   * Save inscription index locally
   */
  private async saveInscriptionIndex(inscription: DailyInscription): Promise<void> {
    const indexPath = join(this.memoryDir, 'ARWEAVE_INDEX.json');
    
    let index: any[] = [];
    try {
      const existing = await fs.readFile(indexPath, 'utf-8');
      index = JSON.parse(existing);
    } catch {
      // File doesn't exist
    }

    index.push({
      dayNumber: inscription.dayNumber,
      timestamp: inscription.timestamp,
      arweaveTx: inscription.arweaveTx,
    });

    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
  }

  /**
   * Git commit the inscription
   */
  private async gitCommit(inscription: DailyInscription): Promise<void> {
    try {
      const message = `chore(memory): inscribe day ${inscription.dayNumber} at ar://${inscription.arweaveTx}`;
      
      await execAsync(`git add -A`, { cwd: this.memoryDir });
      await execAsync(`git commit -m "${message}"`, { cwd: this.memoryDir });
      
      // Push if remote configured
      try {
        await execAsync('git push', { cwd: this.memoryDir });
      } catch {
        // No remote or push failed - non-fatal
      }

  
    } catch (error) {
      // Git commit failed - non-fatal, continue operation
    }
  }

  /**
   * Generate Proof-of-Life (latest Arweave TX)
   */
  async generateProofOfLife(): Promise<string | null> {
    const indexPath = join(this.memoryDir, 'ARWEAVE_INDEX.json');
    
    try {
      const content = await fs.readFile(indexPath, 'utf-8');
      const index = JSON.parse(content);
      
      if (index.length === 0) return null;
      
      const latest = index[index.length - 1];
      return latest.arweaveTx;
    } catch {
      return null;
    }
  }

  /**
   * Get inscription by day number
   */
  async getInscription(dayNumber: number): Promise<DailyInscription | null> {
    // Check memory
    const cached = this.inscriptions.get(dayNumber);
    if (cached) return cached;

    // Check disk
    const indexPath = join(this.memoryDir, 'ARWEAVE_INDEX.json');
    try {
      const content = await fs.readFile(indexPath, 'utf-8');
      const index = JSON.parse(content);
      const entry = index.find((i: any) => i.dayNumber === dayNumber);
      
      if (entry) {
        return {
          dayNumber,
          timestamp: entry.timestamp,
          arweaveTx: entry.arweaveTx,
          content: null as any, // Would need to fetch from Arweave
        };
      }
    } catch {}

    return null;
  }

  /**
   * Get current day number
   */
  private async getDayNumber(): Promise<number> {
    const birthTime = await this.getBirthTime();
    const now = Date.now();
    const diff = now - birthTime;
    return Math.floor(diff / (24 * 60 * 60 * 1000)) + 1;
  }

  /**
   * Get bot birth time
   */
  private async getBirthTime(): Promise<number> {
    try {
      // Try to read from SOUL.md
      const soulPath = join(this.memoryDir, 'SOUL.md');
      const content = await fs.readFile(soulPath, 'utf-8');
      const match = content.match(/Birth:\s*(\d+)/);
      if (match) return parseInt(match[1]);
    } catch {}

    // Fallback to first inscription or now
    return Date.now() - 24 * 60 * 60 * 1000;
  }

  /**
   * Get inscription history
   */
  async getHistory(): Promise<{ dayNumber: number; timestamp: number; arweaveTx: string }[]> {
    const indexPath = join(this.memoryDir, 'ARWEAVE_INDEX.json');
    
    try {
      const content = await fs.readFile(indexPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }
}

// CLI entry
if (require.main === module) {
  const config: ArweaveConfig = {
    bundlrNode: 'https://node1.bundlr.network',
    currency: 'usdc',
    privateKey: process.env.ARWEAVE_JWK_ENCRYPTED || '',
  };

  const inscriber = new ArweaveInscriber(config);
  
  inscriber.initialize()
    .then(() => inscriber.dailyInscribe())
    .then(result => {
      console.log('Inscription complete:', result);
    })
    .catch(console.error);
}
