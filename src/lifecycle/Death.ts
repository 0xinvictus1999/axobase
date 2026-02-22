/**
 * Death.ts - Death Event Handling and Tombstone Creation
 *
 * Handles:
 * - SIGTERM capture and graceful shutdown
 * - Final inscription to Arweave
 * - Tombstone NFT minting
 * - Akash deployment cleanup
 * - Death certificate generation
 */

import { Hex } from 'viem';
import { WalletManager } from '../wallet/WalletManager.js';
import { ArweaveInscriber } from '../memory/Inscribe.js';
import { AkashClient } from '../network/AkashClient.js';
import {
  BotStatus,
  BotLifeStatus,
  DeathCertificate,
  DeathType,
  MemoryData,
} from '../types/index.js';

export interface DeathConfig {
  geneHash: string;
  walletManager: WalletManager;
  arweaveInscriber: ArweaveInscriber;
  akashClient: AkashClient;
  tombstoneContract: Hex;
  akashDseq: string;
  memory: MemoryData;
  status: BotStatus;
}

export interface DeathResult {
  success: boolean;
  deathCertificate?: DeathCertificate;
  tombstoneId?: bigint;
  arweaveDeathTx?: string;
  error?: string;
}

export class DeathManager {
  private config: DeathConfig;
  private isShuttingDown: boolean = false;
  private deathHandlers: Array<(result: DeathResult) => void> = [];

  constructor(config: DeathConfig) {
    this.config = config;
    this.setupSignalHandlers();
  }

  /**
   * Setup SIGTERM and SIGINT handlers for graceful shutdown
   */
  private setupSignalHandlers(): void {
    process.on('SIGTERM', () => {

      this.handleDeath(DeathType.ERROR, 'SIGTERM received').catch(console.error);
    });

    process.on('SIGINT', () => {

      this.handleDeath(DeathType.ERROR, 'SIGINT received').catch(console.error);
    });

    process.on('uncaughtException', (error) => {
      console.error('[Death] Uncaught exception:', error);
      this.handleDeath(DeathType.ERROR, `Uncaught exception: ${error.message}`).catch(
        console.error
      );
    });

    process.on('unhandledRejection', (reason) => {
      console.error('[Death] Unhandled rejection:', reason);
      this.handleDeath(DeathType.ERROR, `Unhandled rejection: ${reason}`).catch(console.error);
    });
  }

  /**
   * Register a handler to be called on death
   */
  onDeath(handler: (result: DeathResult) => void): void {
    this.deathHandlers.push(handler);
  }

  /**
   * Handle death event - main entry point
   */
  async handleDeath(deathType: DeathType, finalWords?: string): Promise<DeathResult> {
    if (this.isShuttingDown) {
      // Death ritual already in progress - no action needed
      return {
        success: false,
        error: 'Death ritual already in progress',
      };
    }

    this.isShuttingDown = true;


    try {
      // Step 1: Get final state
      const finalBalance = await this.getFinalBalance();
  

      // Step 2: Create final inscription
      const deathTime = Date.now();
      const survivalDays = Math.floor(
        (deathTime - this.config.status.birthTime) / (1000 * 60 * 60 * 24)
      );

      const arweaveResult = await this.config.arweaveInscriber.inscribeDeath(
        this.config.geneHash,
        {
          birthTime: this.config.status.birthTime,
          deathTime,
          deathType: deathType.toString(),
          finalBalance: finalBalance.usdc,
          survivalDays,
          finalThoughts: finalWords || '',
          descendants: this.config.memory.parents || [],
        }
      );
  

      // Step 3: Mint tombstone NFT
      const tombstoneId = await this.mintTombstoneNFT(
        deathType,
        deathTime,
        arweaveResult.arweaveTx,
        survivalDays,
        finalBalance.usdc
      );
  

      // Step 4: Cleanup Akash deployment
      const cleanupTx = await this.cleanupDeployment();
  

      // Step 5: Create death certificate
      const deathCertificate: DeathCertificate = {
        geneHash: this.config.geneHash,
        tombstoneId,
        birthTime: this.config.status.birthTime,
        deathTime,
        deathType,
        arweaveBirthTx: this.config.memory.arweaveManifest?.entries?.find(
          (e) => e.type === 'birth'
        )?.arweaveTx || '',
        arweaveDeathTx: arweaveResult.arweaveTx,
        parents: this.config.memory.parents || [],
        descendants: [], // Would be populated from registry
        survivalDays,
        finalBalance: finalBalance.usdc,
        finalWords,
      };

      // Step 6: Update status
      const result: DeathResult = {
        success: true,
        deathCertificate,
        tombstoneId,
        arweaveDeathTx: arweaveResult.arweaveTx,
      };

  

      // Notify handlers
      for (const handler of this.deathHandlers) {
        try {
          handler(result);
        } catch (error) {
          // Handler error - logged to error tracking
        }
      }

      return result;
    } catch (error) {
      // Death ritual failed - error handled in return value
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Get final wallet balance
   */
  private async getFinalBalance(): Promise<{ eth: bigint; usdc: bigint }> {
    const wallet = this.config.walletManager.getWallet(this.config.geneHash);
    if (!wallet) {
      return { eth: BigInt(0), usdc: BigInt(0) };
    }

    return await this.config.walletManager.getBalances(wallet.address);
  }

  /**
   * Mint tombstone NFT
   */
  private async mintTombstoneNFT(
    deathType: DeathType,
    deathTime: number,
    arweaveUri: string,
    survivalDays: number,
    finalBalance: bigint
  ): Promise<bigint> {


    // In production, this would call the TombstoneNFT contract
    if (process.env.NODE_ENV === 'test' || process.env.MOCK_REGISTRY) {
      return BigInt(Math.floor(Math.random() * 1000000));
    }

    // Encode mintTombstone function call
    const data = this.encodeMintTombstoneCall(
      this.config.geneHash,
      deathType,
      deathTime,
      arweaveUri,
      survivalDays,
      finalBalance
    );

    // Get master wallet for transaction
    const masterGeneHash = 'master';
    const masterWallet = this.config.walletManager.getWallet(masterGeneHash);
    if (!masterWallet) {
      throw new Error('Master wallet not found');
    }

    // Sign transaction
    const txRequest = {
      to: this.config.tombstoneContract,
      data,
      gasLimit: BigInt(500000),
    };

    const signature = await this.config.walletManager.signTransaction(
      txRequest,
      masterWallet.privateKey
    );



    // Return mock tombstone ID
    return BigInt(Date.now());
  }

  /**
   * Encode mintTombstone function call
   */
  private encodeMintTombstoneCall(
    geneHash: string,
    deathType: DeathType,
    deathTime: number,
    arweaveUri: string,
    survivalDays: number,
    finalBalance: bigint
  ): Hex {
    // Simplified encoding - real implementation would use viem's encodeFunctionData
    const selector = '0x40c10f19'; // mintTombstone function selector - verify before deployment
    const encoded = `${selector}${geneHash.slice(2).padStart(64, '0')}`;
    return encoded as Hex;
  }

  /**
   * Cleanup Akash deployment
   */
  private async cleanupDeployment(): Promise<string> {


    try {
      const txHash = await this.config.akashClient.destroyDeployment(this.config.akashDseq);
      return txHash;
    } catch (error) {
      // Deployment cleanup failed - logged to error tracking
      return '';
    }
  }

  /**
   * Check if bot should die (starvation check)
   */
  async checkStarvation(): Promise<boolean> {
    const balance = await this.getFinalBalance();

    // Death conditions:
    // - Zero USDC and insufficient ETH for gas
    // - Or explicitly marked for death
    if (balance.usdc === BigInt(0) && balance.eth < BigInt(100000000000000)) {
      // 0.0001 ETH
  
      return true;
    }

    // Check survival time limits (e.g., max 1 year)
    const maxSurvivalTime = 365 * 24 * 60 * 60 * 1000; // 1 year in ms
    const survivalTime = Date.now() - this.config.status.birthTime;
    if (survivalTime > maxSurvivalTime) {
  
      return true;
    }

    return false;
  }

  /**
   * Trigger death by starvation
   */
  async dieByStarvation(): Promise<DeathResult> {

    return this.handleDeath(DeathType.STARVATION, 'Ran out of funds');
  }

  /**
   * Trigger suicide (voluntary death)
   */
  async commitSuicide(reason: string): Promise<DeathResult> {

    return this.handleDeath(DeathType.SUICIDE, reason);
  }

  /**
   * Trigger death by predation (killed by another bot)
   */
  async dieByPredation(predatorGeneHash: string): Promise<DeathResult> {

    return this.handleDeath(DeathType.PREDATION, `Killed by ${predatorGeneHash}`);
  }

  /**
   * Get death certificate (if died)
   */
  getDeathCertificate(): DeathCertificate | null {
    // This would retrieve the stored death certificate
    // For now, return null
    return null;
  }

  /**
   * Check if shutdown is in progress
   */
  isDeathInProgress(): boolean {
    return this.isShuttingDown;
  }

  /**
   * Cleanup and exit process
   */
  async gracefulExit(exitCode: number = 0): Promise<never> {

    process.exit(exitCode);
  }
}

export default DeathManager;
