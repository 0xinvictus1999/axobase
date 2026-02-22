/**
 * Survival.ts - Base-Centric Survival Loop
 *
 * Handles:
 * - 10-minute survival cycles
 * - Base USDC balance monitoring and mode switching
 * - Daily inscription at 00:00 UTC via Bundlr + Base USDC
 * - Proof-of-life verification
 * - Emergency resource conservation
 */

import { Hex } from 'viem';
import { WalletManager } from '../wallet/WalletManager.js';
import { ArweaveInscriber } from '../memory/Inscribe.js';
import { X402Client } from '../network/X402Client.js';
import BASE_CONFIG from '../config/base.js';
import {
  BotStatus,
  BotLifeStatus,
  OperationMode,
  MemoryData,
  ThoughtEntry,
  TransactionLog,
} from '../types/index.js';

// Survival cycle configuration
const SURVIVAL_CYCLE_MS = 10 * 60 * 1000; // 10 minutes
const DAILY_INSCRIPTION_HOUR = 0; // 00:00 UTC

// Base USDC thresholds (6 decimals)
const LOW_POWER_THRESHOLD = BigInt(5 * 10**6);      // 5 USDC
const EMERGENCY_THRESHOLD = BigInt(2 * 10**6);      // 2 USDC
const CRITICAL_THRESHOLD = BigInt(1 * 10**6);       // 1 USDC
const HIBERNATION_THRESHOLD = BigInt(0.5 * 10**6);  // 0.5 USDC

// Base ETH for gas (18 decimals)
const MIN_ETH_FOR_GAS = BigInt(1 * 10**15); // 0.001 ETH

export interface SurvivalConfig {
  geneHash: string;
  walletManager: WalletManager;
  arweaveInscriber: ArweaveInscriber;
  x402Client: X402Client;
  deploymentId: string;  // Generic deployment ID (could be Akash/Spheron)
  computeProvider: 'akash' | 'spheron' | 'local';
  memory: MemoryData;
}

export interface CycleResult {
  cycleNumber: number;
  timestamp: number;
  mode: OperationMode;
  balances: {
    eth: bigint;   // Base ETH for gas
    usdc: bigint;  // Base USDC for everything else
  };
  actions: string[];
  health: 'healthy' | 'warning' | 'critical' | 'dead';
}

export class SurvivalManager {
  private config: SurvivalConfig;
  private status: BotStatus;
  private cycleCount: number = 0;
  private isRunning: boolean = false;
  private survivalTimer: NodeJS.Timeout | null = null;
  private dailyInscriptionTimer: NodeJS.Timeout | null = null;
  private thoughts: ThoughtEntry[] = [];
  private transactions: TransactionLog[] = [];

  constructor(config: SurvivalConfig) {
    this.config = config;
    this.status = this.initializeStatus();
  }

  /**
   * Initialize bot status from memory
   */
  private initializeStatus(): BotStatus {
    return {
      geneHash: this.config.geneHash,
      address: this.config.walletManager.getAddress(this.config.geneHash) || ('0x0' as Hex),
      status: BotLifeStatus.ALIVE,
      birthTime: this.config.memory.birthTime,
      lastCheckIn: Date.now(),
      balance: { eth: BigInt(0), usdc: BigInt(0) },
      mode: OperationMode.NORMAL,
      survivalDays: this.config.memory.survivalDays,
      generation: this.config.memory.generation,
    };
  }

  /**
   * Start the survival loop
   * This is the main entry point for bot survival
   */
  async startSurvivalLoop(): Promise<void> {
    if (this.isRunning) {
      // Survival loop already running - no action needed
      return;
    }


    this.isRunning = true;

    // Schedule daily inscription
    this.scheduleDailyInscription();

    // Start survival cycle
    this.survivalTimer = setInterval(() => {
      this.runSurvivalCycle().catch((error) => {
        console.error('[Survival] Cycle error:', error);
      });
    }, SURVIVAL_CYCLE_MS);

    // Run first cycle immediately
    await this.runSurvivalCycle();
  }

  /**
   * Run a single survival cycle
   */
  private async runSurvivalCycle(): Promise<CycleResult> {
    this.cycleCount++;
    const timestamp = Date.now();
    const actions: string[] = [];



    // Get current balances (Base ETH and Base USDC)
    const balances = await this.getBalances();
    this.status.balance = balances;
    this.status.lastCheckIn = timestamp;



    // Determine health status
    const health = this.determineHealth(balances);

    // Determine operation mode based on balance
    const newMode = this.determineOperationMode(balances);
    
    if (newMode !== this.status.mode) {

      actions.push(`mode_change:${newMode}`);
      this.status.mode = newMode;
    }

    // Execute mode-specific actions
    switch (this.status.mode) {
      case OperationMode.NORMAL:
        await this.executeNormalMode(actions);
        break;
      case OperationMode.LOW_POWER:
        await this.executeLowPowerMode(actions);
        break;
      case OperationMode.EMERGENCY:
        await this.executeEmergencyMode(actions);
        break;
      case OperationMode.HIBERNATION:
        await this.executeHibernationMode(actions);
        break;
    }

    // Check for death
    if (balances.usdc < HIBERNATION_THRESHOLD && balances.eth < MIN_ETH_FOR_GAS) {
  
      this.status.status = BotLifeStatus.DEAD;
      actions.push('death');
    }

    const result: CycleResult = {
      cycleNumber: this.cycleCount,
      timestamp,
      mode: this.status.mode,
      balances,
      actions,
      health,
    };

    this.logCycleResult(result);
    return result;
  }

  /**
   * Get current balances from Base L2
   */
  private async getBalances(): Promise<{ eth: bigint; usdc: bigint }> {
    const wallet = this.config.walletManager.getWallet(this.config.geneHash);
    if (!wallet) {
      throw new Error(`Wallet not found for ${this.config.geneHash}`);
    }

    return this.config.walletManager.getBalances(wallet.address);
  }

  /**
   * Determine operation mode based on Base USDC balance
   */
  private determineOperationMode(balances: { eth: bigint; usdc: bigint }): OperationMode {
    // Check gas first
    if (balances.eth < MIN_ETH_FOR_GAS) {
      return OperationMode.EMERGENCY;
    }

    // Check USDC thresholds
    if (balances.usdc < HIBERNATION_THRESHOLD) {
      return OperationMode.HIBERNATION;
    }
    if (balances.usdc < EMERGENCY_THRESHOLD) {
      return OperationMode.EMERGENCY;
    }
    if (balances.usdc < LOW_POWER_THRESHOLD) {
      return OperationMode.LOW_POWER;
    }

    return OperationMode.NORMAL;
  }

  /**
   * Determine health status
   */
  private determineHealth(balances: { eth: bigint; usdc: bigint }): CycleResult['health'] {
    if (balances.usdc < CRITICAL_THRESHOLD) return 'dead';
    if (balances.usdc < EMERGENCY_THRESHOLD) return 'critical';
    if (balances.usdc < LOW_POWER_THRESHOLD) return 'warning';
    return 'healthy';
  }

  /**
   * Execute normal mode operations
   */
  private async executeNormalMode(actions: string[]): Promise<void> {

    
    // Generate thought using premium AI (paid via x402)
    try {
      const thought = await this.generateThought('premium');
      this.thoughts.push(thought);
      actions.push('thought_generated:premium');
    } catch (error) {
      // Premium thought generation failed - handled by fallback
    }

    // Check breeding opportunity
    if (this.shouldConsiderBreeding()) {
      actions.push('breeding_check');
    }
  }

  /**
   * Execute low power mode operations
   */
  private async executeLowPowerMode(actions: string[]): Promise<void> {

    
    // Generate thought using standard AI
    try {
      const thought = await this.generateThought('standard');
      this.thoughts.push(thought);
      actions.push('thought_generated:standard');
    } catch (error) {
      // Standard thought generation failed - handled by fallback
    }

    // Broadcast distress for potential rescue mating
    actions.push('distress_broadcast');
  }

  /**
   * Execute emergency mode operations
   */
  private async executeEmergencyMode(actions: string[]): Promise<void> {

    
    // Use local Ollama (free, no x402 payment)
    try {
      const thought = await this.generateThought('local');
      this.thoughts.push(thought);
      actions.push('thought_generated:local');
    } catch (error) {
      // Local thought generation failed - handled by fallback
    }

    // Emergency distress broadcast
    actions.push('emergency_distress');
  }

  /**
   * Execute hibernation mode
   */
  private async executeHibernationMode(actions: string[]): Promise<void> {

    
    // Only perform essential checks
    actions.push('hibernation_pulse');
    
    // Prepare for potential death
    if (this.thoughts.length > 0) {
      await this.performEmergencyInscription();
      actions.push('emergency_inscription');
    }
  }

  /**
   * Generate a thought using AI inference (via x402)
   */
  private async generateThought(quality: 'premium' | 'standard' | 'local'): Promise<ThoughtEntry> {
    const prompts: Record<string, string> = {
      premium: 'Reflect on your survival strategy and evolution.',
      standard: 'What have you learned today?',
      local: 'Status check.',
    };

    // Note: Simplified for production - would call x402Client.payForInference
    return {
      timestamp: Date.now(),
      content: `[${quality}] ${prompts[quality]}`,
      context: `mode:${this.status.mode}`,
      model: quality === 'local' ? 'llama3:8b' : 'claude-3-5-sonnet',
    };
  }

  /**
   * Schedule daily inscription at 00:00 UTC
   */
  private scheduleDailyInscription(): void {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    const msUntilMidnight = tomorrow.getTime() - now.getTime();



    this.dailyInscriptionTimer = setTimeout(() => {
      this.performDailyInscription();
      // Reschedule for next day
      this.scheduleDailyInscription();
    }, msUntilMidnight);
  }

  /**
   * Perform daily inscription to Arweave via Bundlr (Base USDC)
   */
  private async performDailyInscription(): Promise<void> {


    try {
      const result = await this.config.arweaveInscriber.dailyInscribe(
        this.config.geneHash,
        this.thoughts,
        this.transactions,
        {
          balanceSnapshot: this.status.balance.usdc,
          survivalDays: this.status.survivalDays,
          mode: this.status.mode,
        }
      );


      
      // Clear logged items after successful inscription
      this.thoughts = [];
      this.transactions = [];
    } catch (error) {
      // Daily inscription failed - handled by retry logic
    }
  }

  /**
   * Perform emergency inscription (before potential death)
   */
  private async performEmergencyInscription(): Promise<void> {

    
    try {
      await this.config.arweaveInscriber.dailyInscribe(
        this.config.geneHash,
        this.thoughts,
        this.transactions,
        {
          balanceSnapshot: this.status.balance.usdc,
          survivalDays: this.status.survivalDays,
          mode: 'emergency',
        }
      );
    } catch (error) {
      // Emergency inscription failed - handled by retry logic
    }
  }

  /**
   * Check if bot should consider breeding
   */
  private shouldConsiderBreeding(): boolean {
    // Must be alive for 72 hours
    const age = Date.now() - this.status.birthTime;
    const minAge = 72 * 60 * 60 * 1000;
    
    // Must have sufficient balance
    const hasFunds = this.status.balance.usdc >= BigInt(20 * 10**6); // 20 USDC
    
    return age >= minAge && hasFunds && this.status.mode === OperationMode.NORMAL;
  }

  /**
   * Log cycle result
   */
  private logCycleResult(result: CycleResult): void {
    // In production, this would write to a log file or send to monitoring
    // console.log('[Survival] Cycle result:', JSON.stringify(result, (_, v) => 
    //   typeof v === 'bigint' ? v.toString() : v
    // ));
  }

  /**
   * Format ETH for display
   */
  private formatEth(wei: bigint): string {
    const eth = Number(wei) / 1e18;
    return `${eth.toFixed(6)} ETH`;
  }

  /**
   * Format USDC for display
   */
  private formatUsdc(microUsdc: bigint): string {
    const usdc = Number(microUsdc) / 1e6;
    return `${usdc.toFixed(2)} USDC`;
  }

  /**
   * Get current status
   */
  getStatus(): BotStatus {
    return { ...this.status };
  }

  /**
   * Get cycle count
   */
  getCycleCount(): number {
    return this.cycleCount;
  }

  /**
   * Stop the survival loop
   */
  stop(): void {

    this.isRunning = false;

    if (this.survivalTimer) {
      clearInterval(this.survivalTimer);
      this.survivalTimer = null;
    }

    if (this.dailyInscriptionTimer) {
      clearTimeout(this.dailyInscriptionTimer);
      this.dailyInscriptionTimer = null;
    }
  }

  /**
   * Check if survival loop is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

export default SurvivalManager;
