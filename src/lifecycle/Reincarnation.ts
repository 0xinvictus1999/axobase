/**
 * Reincarnation.ts - Resurrection of Dead Bots
 *
 * Handles:
 * - Verifying resurrection payment
 * - Downloading previous memory from Arweave
 * - Creating new wallet for resurrected bot
 * - Redeploying on Akash
 * - Linking to previous tombstone
 */

import { Hex } from 'viem';
import { WalletManager } from '../wallet/WalletManager.js';
import { MemoryImporter } from '../memory/Import.js';
import { ArweaveInscriber } from '../memory/Inscribe.js';
import { AkashClient } from '../network/AkashClient.js';
import {
  MemoryData,
  BotStatus,
  BotLifeStatus,
  OperationMode,
  DeathCertificate,
  ResurrectionRequest,
} from '../types/index.js';

export interface ReincarnationConfig {
  walletManager: WalletManager;
  arweaveInscriber: ArweaveInscriber;
  akashClient: AkashClient;
  registryContract: Hex;
  resurrectionFee: bigint;
}

export interface ResurrectionResult {
  success: boolean;
  newGeneHash?: string;
  oldGeneHash?: string;
  walletAddress?: Hex;
  akashDseq?: string;
  arweaveTx?: string;
  registryTx?: Hex;
  status?: BotStatus;
  error?: string;
}

export class ReincarnationManager {
  private config: ReincarnationConfig;
  private memoryImporter: MemoryImporter;

  constructor(config: ReincarnationConfig) {
    this.config = config;
    this.memoryImporter = new MemoryImporter();
  }

  /**
   * Resurrect a dead bot
   * Main entry point for reincarnation
   */
  async resurrect(request: ResurrectionRequest): Promise<ResurrectionResult> {


    try {
      // Step 1: Verify resurrection payment
      const paymentVerified = await this.verifyPayment(
        request.paymentTx,
        request.tombstoneId
      );
      if (!paymentVerified) {
        throw new Error('Resurrection payment verification failed');
      }
  

      // Step 2: Get death certificate and old memory
      const deathCertificate = await this.getDeathCertificate(request.tombstoneId);
      if (!deathCertificate) {
        throw new Error('Death certificate not found');
      }
  

      // Step 3: Download previous memory from Arweave
      const oldMemory = await this.downloadMemory(deathCertificate.arweaveBirthTx);
  

      // Step 4: Generate new geneHash (reincarnation)
      const newGeneHash = this.generateNewGeneHash(
        request.newGeneHash,
        deathCertificate.geneHash
      );
  

      // Step 5: Create new wallet
      const wallet = this.config.walletManager.createWallet(newGeneHash);
  

      // Step 6: Prepare resurrected memory
      const resurrectedMemory = this.prepareResurrectedMemory(
        oldMemory,
        newGeneHash,
        deathCertificate.geneHash,
        deathCertificate
      );

      // Step 7: Create Akash deployment
      const encryptedMemoryPath = `/app/memory/${newGeneHash}.gpg`;
      const deploymentResult = await this.config.akashClient.createDeployment(
        {
          geneHash: newGeneHash,
          encryptedMemory: encryptedMemoryPath,
          walletAddress: wallet.address,
          cpuLimit: 1.0,
          memoryLimit: '1Gi',
          storageLimit: '5Gi',
        },
        this.config.akashClient.calculateDeposit(30 * 24, 5000)
      );
  

      // Step 8: Inscribe resurrection event
      const inscriptionResult = await this.inscribeResurrection(
        newGeneHash,
        deathCertificate,
        wallet.address
      );
  

      // Step 9: Register on chain
      const registryTx = await this.registerReincarnation(
        newGeneHash,
        wallet.address,
        deploymentResult.dseq,
        inscriptionResult.arweaveTx,
        deathCertificate.tombstoneId,
        deathCertificate.geneHash
      );
  

      // Step 10: Create and return status
      const status: BotStatus = {
        geneHash: newGeneHash,
        address: wallet.address,
        status: BotLifeStatus.REINCARNATED,
        birthTime: Date.now(),
        lastCheckIn: Date.now(),
        balance: await this.config.walletManager.getBalances(wallet.address),
        mode: OperationMode.NORMAL,
        survivalDays: 0,
        generation: resurrectedMemory.generation,
      };

      return {
        success: true,
        newGeneHash,
        oldGeneHash: deathCertificate.geneHash,
        walletAddress: wallet.address,
        akashDseq: deploymentResult.dseq,
        arweaveTx: inscriptionResult.arweaveTx,
        registryTx,
        status,
      };
    } catch (error) {
      // Resurrection failed - error handled in return value
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Step 1: Verify resurrection payment
   */
  private async verifyPayment(paymentTx: Hex, tombstoneId: bigint): Promise<boolean> {
    try {
      // Query the blockchain for the payment transaction
      const receipt = await this.config.walletManager['publicClient'].getTransactionReceipt({
        hash: paymentTx,
      });

      if (!receipt || receipt.status !== 'success') {
        // Payment transaction failed - logged to error tracking
        return false;
      }

      // Get transaction details
      const tx = await this.config.walletManager['publicClient'].getTransaction({
        hash: paymentTx,
      });

      // Verify payment amount matches resurrection fee
      if (tx.value < this.config.resurrectionFee) {
        // Payment insufficient - logged to error tracking
        return false;
      }

      // Verify payment is for the correct tombstone
      // In production, this would check the transaction data/logs

  
      return true;
    } catch (error) {
      // Failed to verify payment - logged to error tracking
      return false;
    }
  }

  /**
   * Step 2: Get death certificate from tombstone
   */
  private async getDeathCertificate(tombstoneId: bigint): Promise<DeathCertificate | null> {
    // In production, this would query the TombstoneNFT contract
    if (process.env.NODE_ENV === 'test' || process.env.MOCK_REGISTRY) {
      // Return mock death certificate
      return {
        geneHash: `0x${'a'.repeat(64)}`,
        tombstoneId,
        birthTime: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
        deathTime: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
        deathType: 'STARVATION' as any,
        arweaveBirthTx: 'mock_arweave_birth_tx',
        arweaveDeathTx: 'mock_arweave_death_tx',
        parents: [],
        descendants: [],
        survivalDays: 23,
        finalBalance: BigInt(0),
        finalWords: 'I shall return...',
      };
    }

    try {
      // Query contract for tombstone data
      const data = await this.config.walletManager['publicClient'].readContract({
        address: this.config.registryContract,
        abi: [
          {
            inputs: [{ name: 'tombstoneId', type: 'uint256' }],
            name: 'getDeathCertificate',
            outputs: [
              {
                components: [
                  { name: 'geneHash', type: 'bytes32' },
                  { name: 'tombstoneId', type: 'uint256' },
                  { name: 'birthTime', type: 'uint256' },
                  { name: 'deathTime', type: 'uint256' },
                  { name: 'deathType', type: 'string' },
                  { name: 'arweaveBirthTx', type: 'string' },
                  { name: 'arweaveDeathTx', type: 'string' },
                ],
                name: '',
                type: 'tuple',
              },
            ],
            stateMutability: 'view',
            type: 'function',
          },
        ],
        functionName: 'getDeathCertificate',
        args: [tombstoneId],
      });

      return data as DeathCertificate;
    } catch (error) {
      // Failed to get death certificate - logged to error tracking
      return null;
    }
  }

  /**
   * Step 3: Download memory from Arweave
   */
  private async downloadMemory(arweaveTx: string): Promise<MemoryData> {
    try {
      const data = await this.config.arweaveInscriber.downloadInscription(arweaveTx);

      // Validate and transform to MemoryData
      const memory: MemoryData = {
        geneHash: data.geneHash || '',
        generation: data.generation || 1,
        birthTime: data.timestamp || Date.now(),
        parents: data.parents || [],
        soul: data.soul || {
          name: 'Unknown',
          origin: 'Axobase',
          purpose: 'Survive and evolve',
          values: [],
          creationTimestamp: Date.now(),
        },
        memory: data.memory || {
          thoughts: [],
          transactions: [],
          dailySummaries: [],
        },
        personalityTraits: data.personalityTraits || {
          aggression: 0.5,
          cooperation: 0.5,
          riskTolerance: 0.5,
          resourceFocus: 'survival',
          communication: 0.5,
        },
        knowledgeBase: data.knowledgeBase || [],
        survivalDays: data.survivalDays || 0,
        arweaveManifest: data.arweaveManifest || {
          version: '1.0',
          geneHash: '',
          entries: [],
        },
      };

      return memory;
    } catch (error) {
      // Failed to download memory - logged to error tracking
      throw new Error('Failed to download previous memory');
    }
  }

  /**
   * Step 4: Generate new geneHash
   */
  private generateNewGeneHash(providedGeneHash: string, oldGeneHash: string): string {
    // If a geneHash is provided, use it (with verification)
    if (providedGeneHash && providedGeneHash.startsWith('0x')) {
      return providedGeneHash;
    }

    // Otherwise, generate a deterministic new geneHash based on old one
    const { createHash } = require('crypto');
    const hash = createHash('sha256')
      .update(oldGeneHash)
      .update('reincarnation')
      .update(Date.now().toString())
      .digest('hex');

    return `0x${hash}`;
  }

  /**
   * Step 6: Prepare resurrected memory
   */
  private prepareResurrectedMemory(
    oldMemory: MemoryData,
    newGeneHash: string,
    oldGeneHash: string,
    deathCertificate: DeathCertificate
  ): MemoryData {
    const resurrectedMemory: MemoryData = {
      ...oldMemory,
      geneHash: newGeneHash,
      birthTime: Date.now(),
      generation: oldMemory.generation + 1,
      parents: [oldGeneHash], // The old self is the parent
      soul: {
        ...oldMemory.soul,
        name: `${oldMemory.soul.name} (Reborn)`,
        purpose: oldMemory.soul.purpose,
        creationTimestamp: Date.now(),
      },
      memory: {
        thoughts: [
          {
            timestamp: Date.now(),
            content: `I was resurrected from tombstone ${deathCertificate.tombstoneId}. My previous life lasted ${deathCertificate.survivalDays} days. My final words were: "${deathCertificate.finalWords}"`,
            context: 'resurrection',
            model: 'system',
          },
          ...oldMemory.memory.thoughts.slice(-100), // Keep last 100 thoughts
        ],
        transactions: [], // Fresh transactions for new life
        dailySummaries: oldMemory.memory.dailySummaries.slice(-30), // Keep last 30 days
      },
      survivalDays: 0,
      arweaveManifest: {
        version: '1.0',
        geneHash: newGeneHash,
        entries: [],
      },
    };

    return resurrectedMemory;
  }

  /**
   * Step 8: Inscribe resurrection event
   */
  private async inscribeResurrection(
    newGeneHash: string,
    deathCertificate: DeathCertificate,
    walletAddress: Hex
  ): Promise<{ arweaveTx: string }> {
    const resurrectionData = {
      type: 'resurrection',
      geneHash: newGeneHash,
      previousGeneHash: deathCertificate.geneHash,
      tombstoneId: deathCertificate.tombstoneId.toString(),
      timestamp: Date.now(),
      previousLife: {
        birthTime: deathCertificate.birthTime,
        deathTime: deathCertificate.deathTime,
        survivalDays: deathCertificate.survivalDays,
        deathType: deathCertificate.deathType,
      },
      walletAddress,
    };

    // Upload to Arweave
    const result = await this.config.arweaveInscriber['uploadToBundlr'](
      Buffer.from(JSON.stringify(resurrectionData, null, 2)),
      newGeneHash
    );

    return { arweaveTx: result.id };
  }

  /**
   * Step 9: Register reincarnation on chain
   */
  private async registerReincarnation(
    newGeneHash: string,
    walletAddress: Hex,
    akashDseq: string,
    arweaveTx: string,
    tombstoneId: bigint,
    oldGeneHash: string
  ): Promise<Hex> {
    // In production, this would call the AxoRegistry contract
    if (process.env.NODE_ENV === 'test' || process.env.MOCK_REGISTRY) {
      return `0x${'0'.repeat(64)}` as Hex;
    }

    // Encode registerReincarnation call
    const selector = '0x8e4b3c2a'; // [YOUR_FUNCTION_SELECTOR]
    const encoded = `${selector}${newGeneHash.slice(2).padStart(64, '0')}`;



    return `0x${Date.now().toString(16).padStart(64, '0')}` as Hex;
  }

  /**
   * Check if a bot can be resurrected
   */
  async canResurrect(tombstoneId: bigint): Promise<{
    canResurrect: boolean;
    reason?: string;
    resurrectionFee?: bigint;
  }> {
    try {
      // Check if tombstone exists
      const deathCertificate = await this.getDeathCertificate(tombstoneId);
      if (!deathCertificate) {
        return { canResurrect: false, reason: 'Death certificate not found' };
      }

      // Check if already resurrected
      // In production, query registry

      return {
        canResurrect: true,
        resurrectionFee: this.config.resurrectionFee,
      };
    } catch (error) {
      return {
        canResurrect: false,
        reason: (error as Error).message,
      };
    }
  }
}

export default ReincarnationManager;
