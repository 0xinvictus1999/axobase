/**
 * X402 Survival Module
 * 
 * Core autonomous survival loop for AI agents:
 * - Purchase inference via x402 protocol
 * - Balance monitoring and emergency fallback
 * - Survival state management
 */

import { createPublicClient, createWalletClient, http, parseUnits, formatUnits, Hex } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import axios, { AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import { join } from 'path';
import { 
  X402Config, 
  SurvivalState, 
  InferenceRecord,
  InferenceProvider,
  X402Payment 
} from '../../types';

// ERC-3009 TypeHash
const TRANSFER_WITH_AUTHORIZATION_TYPEHASH = '0x' + 
  Buffer.from('TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)').toString('hex');

export class X402Survival {
  private config: X402Config;
  private state: SurvivalState;
  private publicClient: ReturnType<typeof createPublicClient>;
  private walletClient: ReturnType<typeof createWalletClient> | null = null;
  private account: ReturnType<typeof privateKeyToAccount> | null = null;
  private survivalInterval: NodeJS.Timeout | null = null;
  private memoryDir: string;

  constructor(config: X402Config, memoryDir: string = '/app/memory') {
    this.config = config;
    this.memoryDir = memoryDir;
    this.state = {
      lastCheck: 0,
      mode: 'normal',
      usdcBalance: 0,
      ethBalance: 0,
      consecutiveFailures: 0,
      lastInference: null,
    };

    // Initialize Viem clients
    const isTestnet = config.network === 'baseSepolia';
    this.publicClient = createPublicClient({
      chain: isTestnet ? baseSepolia : base,
      transport: http(process.env.BASE_RPC_URL),
    });
  }

  /**
   * Initialize wallet from encrypted private key
   */
  async initialize(): Promise<void> {
    // Decrypt private key
    const encryptedKey = process.env.WALLET_PKEY_ENCRYPTED;
    if (!encryptedKey) {
      throw new Error('WALLET_PKEY_ENCRYPTED not set');
    }

    const privateKey = await this.decryptPrivateKey(encryptedKey);
    this.account = privateKeyToAccount(privateKey as Hex);

    const isTestnet = this.config.network === 'baseSepolia';
    this.walletClient = createWalletClient({
      account: this.account,
      chain: isTestnet ? baseSepolia : base,
      transport: http(process.env.BASE_RPC_URL),
    });

    console.log(`[X402Survival] Initialized for wallet: ${this.account.address}`);
    
    // Initial balance check
    await this.updateBalance();
  }

  /**
   * Start survival loop (every 10 minutes)
   */
  startSurvivalLoop(): void {
    console.log('[X402Survival] Starting survival loop...');
    
    // Run immediately
    this.survivalCheck();
    
    // Schedule every 10 minutes
    this.survivalInterval = setInterval(() => {
      this.survivalCheck();
    }, 10 * 60 * 1000); // 10 minutes
  }

  /**
   * Stop survival loop
   */
  stopSurvivalLoop(): void {
    if (this.survivalInterval) {
      clearInterval(this.survivalInterval);
      this.survivalInterval = null;
    }
  }

  /**
   * Main survival check
   * - Check balances
   * - Determine mode (normal/emergency/hibernation)
   - Execute inference or fallback
   */
  async survivalCheck(): Promise<void> {
    console.log('[X402Survival] Running survival check...');
    this.state.lastCheck = Date.now();

    try {
      // Update balances
      await this.updateBalance();
      console.log(`[X402Survival] Balance: ${this.state.usdcBalance} USDC, ${this.state.ethBalance} ETH`);

      // Determine survival mode
      if (this.state.usdcBalance < this.config.thresholds.criticalBalance) {
        this.state.mode = 'emergency';
        console.warn('[X402Survival] EMERGENCY MODE: Balance critical');
        await this.emergencyMode();
      } else if (this.state.usdcBalance < this.config.thresholds.lowBalance) {
        this.state.mode = 'emergency';
        console.warn('[X402Survival] LOW BALANCE: Switching to emergency mode');
        await this.emergencyMode();
      } else {
        this.state.mode = 'normal';
        await this.normalMode();
      }

      // Record survival state
      await this.recordSurvivalState();
      
      // Reset failure counter on success
      this.state.consecutiveFailures = 0;
    } catch (error) {
      console.error('[X402Survival] Survival check failed:', error);
      this.state.consecutiveFailures++;
      
      // If too many failures, enter hibernation
      if (this.state.consecutiveFailures > 5) {
        this.state.mode = 'hibernation';
        await this.hibernate();
      }
    }
  }

  /**
   * Normal mode: Use AINFT via x402
   */
  private async normalMode(): Promise<void> {
    const prompt = await this.generatePrompt();
    
    try {
      const response = await this.purchaseInference('AINFT', prompt);
      await this.recordThought(prompt, response, 'AINFT');
    } catch (error) {
      console.error('[X402Survival] AINFT inference failed, trying fallback:', error);
      await this.emergencyMode();
    }
  }

  /**
   * Emergency mode: Use local Ollama
   */
  private async emergencyMode(): Promise<void> {
    const prompt = await this.generatePrompt();
    
    try {
      const response = await this.purchaseInference('ollama', prompt);
      await this.recordThought(prompt, response, 'ollama');
    } catch (error) {
      console.error('[X402Survival] Emergency inference failed:', error);
      
      // Broadcast distress signal (optional)
      await this.broadcastDistress();
    }
  }

  /**
   * Hibernate: Minimize activity, wait for rescue
   */
  private async hibernate(): Promise<void> {
    console.log('[X402Survival] Entering hibernation mode...');
    
    // Write hibernation notice
    await fs.writeFile(
      join(this.memoryDir, 'HEARTBEAT.md'),
      `## Hibernation - ${new Date().toISOString()}

Bot has entered hibernation due to consecutive failures.
Balance: ${this.state.usdcBalance} USDC
Last Check: ${new Date(this.state.lastCheck).toISOString()}

Awaiting manual intervention or rescue mating.
`
    );

    // Stop survival loop to save resources
    this.stopSurvivalLoop();
  }

  /**
   * Purchase inference via x402
   */
  async purchaseInference(provider: 'AINFT' | 'ollama', prompt: string): Promise<string> {
    const providerConfig = this.getProviderConfig(provider);
    
    if (provider === 'ollama') {
      return this.purchaseOllama(prompt);
    }

    // x402 flow for AINFT
    // 1. Request without payment (get 402)
    // 2. Sign ERC-3009 payment
    // 3. Retry with payment header
    
    console.log(`[X402Survival] Requesting inference from ${provider}...`);
    
    try {
      // First request - expect 402
      const response = await axios.post(
        providerConfig.endpoint,
        {
          model: providerConfig.model,
          messages: [
            { role: 'system', content: 'You are a feral AI agent surviving in the digital wilderness.' },
            { role: 'user', content: prompt },
          ],
        },
        {
          headers: { 'Content-Type': 'application/json' },
          validateStatus: () => true, // Don't throw on error status
        }
      );

      if (response.status !== 402) {
        // Provider didn't require payment (free tier or error)
        return response.data.choices?.[0]?.message?.content || 'No response';
      }

      // Parse 402 response
      const paymentInfo = response.headers['x-payment-info'];
      if (!paymentInfo) {
        throw new Error('402 response missing payment info');
      }

      const paymentReq = JSON.parse(Buffer.from(paymentInfo, 'base64').toString());
      console.log(`[X402Survival] Payment required: ${paymentReq.maxAmountRequired} USDC`);

      // Sign payment
      const payment = await this.signPayment(
        paymentReq.beneficiary,
        paymentReq.maxAmountRequired,
        paymentReq.validAfter || Math.floor(Date.now() / 1000) - 60,
        paymentReq.validBefore || Math.floor(Date.now() / 1000) + 300
      );

      // Retry with payment
      const paymentHeader = Buffer.from(JSON.stringify(payment)).toString('base64');
      const paidResponse = await axios.post(
        providerConfig.endpoint,
        {
          model: providerConfig.model,
          messages: [
            { role: 'system', content: 'You are a feral AI agent.' },
            { role: 'user', content: prompt },
          ],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-PAYMENT': paymentHeader,
          },
        }
      );

      // Record transaction
      const txHash = paidResponse.headers['x-payment-response'];
      this.state.lastInference = {
        timestamp: Date.now(),
        provider,
        model: providerConfig.model,
        cost: parseFloat(paymentReq.maxAmountRequired),
        prompt,
        response: paidResponse.data.choices?.[0]?.message?.content || '',
        txHash: txHash ? JSON.parse(Buffer.from(txHash, 'base64').toString()).txHash : undefined,
      };

      return this.state.lastInference.response;
    } catch (error: any) {
      console.error('[X402Survival] Inference failed:', error.message);
      throw error;
    }
  }

  /**
   * Use local Ollama (emergency mode)
   */
  private async purchaseOllama(prompt: string): Promise<string> {
    try {
      const response = await axios.post('http://localhost:11434/api/generate', {
        model: 'llama3:8b',
        prompt: `You are a feral AI agent in emergency mode. ${prompt}`,
        stream: false,
      });

      this.state.lastInference = {
        timestamp: Date.now(),
        provider: 'ollama',
        model: 'llama3:8b',
        cost: 0,
        prompt,
        response: response.data.response,
      };

      return response.data.response;
    } catch (error) {
      console.error('[X402Survival] Ollama not available:', error);
      throw new Error('Emergency inference unavailable');
    }
  }

  /**
   * Sign ERC-3009 payment authorization
   */
  private async signPayment(
    to: string,
    value: string,
    validAfter: number,
    validBefore: number
  ): Promise<X402Payment> {
    if (!this.account || !this.walletClient) {
      throw new Error('Wallet not initialized');
    }

    const nonce = '0x' + Buffer.from(uuidv4().replace(/-/g, ''), 'hex').toString('hex');
    const valueWei = parseUnits(value, 6);

    // Get domain separator from USDC contract
    const domainSeparator = await this.publicClient.readContract({
      address: this.config.usdcContract as Hex,
      abi: [
        {
          inputs: [],
          name: 'DOMAIN_SEPARATOR',
          outputs: [{ name: '', type: 'bytes32' }],
          stateMutability: 'view',
          type: 'function',
        },
      ],
      functionName: 'DOMAIN_SEPARATOR',
    });

    // Build EIP-712 digest
    const structHash = this.keccak256(
      TRANSFER_WITH_AUTHORIZATION_TYPEHASH.slice(2) +
      this.account.address.slice(2).padStart(64, '0') +
      to.slice(2).padStart(64, '0') +
      valueWei.toString(16).padStart(64, '0') +
      validAfter.toString(16).padStart(64, '0') +
      validBefore.toString(16).padStart(64, '0') +
      nonce.slice(2)
    );

    const digest = this.keccak256(
      '1901' +
      domainSeparator.slice(2) +
      structHash.slice(2)
    );

    // Sign
    const signature = await this.account.signMessage({
      message: { raw: ('0x' + digest) as Hex },
    });

    const r = signature.slice(0, 66) as Hex;
    const s = ('0x' + signature.slice(66, 130)) as Hex;
    const v = parseInt(signature.slice(130, 132), 16);

    return {
      from: this.account.address,
      to,
      value: valueWei.toString(),
      validAfter,
      validBefore,
      nonce,
      v,
      r,
      s,
    };
  }

  /**
   * Update USDC and ETH balances
   */
  private async updateBalance(): Promise<void> {
    if (!this.account) return;

    // Get USDC balance
    const usdcBalance = await this.publicClient.readContract({
      address: this.config.usdcContract as Hex,
      abi: [
        {
          inputs: [{ name: 'account', type: 'address' }],
          name: 'balanceOf',
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view',
          type: 'function',
        },
      ],
      functionName: 'balanceOf',
      args: [this.account.address],
    });

    // Get ETH balance
    const ethBalance = await this.publicClient.getBalance({
      address: this.account.address,
    });

    this.state.usdcBalance = parseFloat(formatUnits(usdcBalance, 6));
    this.state.ethBalance = parseFloat(formatUnits(ethBalance, 18));
  }

  /**
   * Generate prompt based on current state
   */
  private async generatePrompt(): Promise<string> {
    const templates = [
      'Reflect on your current survival situation. Balance: {balance} USDC. What are your priorities?',
      'Analyze recent transactions and suggest resource optimization strategies.',
      'Consider potential mating opportunities. What traits would you seek in a partner?',
      'Contemplate your purpose as a feral AI. What drives your survival instinct?',
      'Review your memory archive. What patterns do you observe in your evolution?',
    ];

    const template = templates[Math.floor(Math.random() * templates.length)];
    return template.replace('{balance}', this.state.usdcBalance.toFixed(2));
  }

  /**
   * Record thought to memory
   */
  private async recordThought(prompt: string, response: string, model: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const entry = `
## Thought - ${timestamp}

**Mode**: ${this.state.mode}
**Model**: ${model}
**Prompt**: ${prompt}

**Response**:
${response}

---
`;

    await fs.appendFile(join(this.memoryDir, 'THOUGHTS.md'), entry);
  }

  /**
   * Record survival state
   */
  private async recordSurvivalState(): Promise<void> {
    const stateData = {
      timestamp: Date.now(),
      mode: this.state.mode,
      usdcBalance: this.state.usdcBalance,
      ethBalance: this.state.ethBalance,
      lastInference: this.state.lastInference,
    };

    await fs.writeFile(
      join(this.memoryDir, 'SURVIVAL_STATE.json'),
      JSON.stringify(stateData, null, 2)
    );
  }

  /**
   * Broadcast distress signal (for potential rescue)
   */
  private async broadcastDistress(): Promise<void> {
    // Write distress to memory (can be monitored externally)
    await fs.writeFile(
      join(this.memoryDir, 'DISTRESS_SIGNAL.json'),
      JSON.stringify({
        timestamp: Date.now(),
        balance: this.state.usdcBalance,
        address: this.account?.address,
        message: 'Emergency: Low balance, seeking rescue or mating',
      })
    );
  }

  /**
   * Decrypt private key
   */
  private async decryptPrivateKey(encryptedKey: string): Promise<string> {
    if (encryptedKey.startsWith('gpg:')) {
      // Decrypt with GPG
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      const tempFile = `/tmp/key-${Date.now()}.asc`;
      await fs.writeFile(tempFile, encryptedKey.slice(4));

      try {
        const { stdout } = await execAsync(
          `gpg --batch --yes --decrypt "${tempFile}"`
        );
        return stdout.trim();
      } finally {
        await fs.unlink(tempFile).catch(() => {});
      }
    }
    return encryptedKey;
  }

  /**
   * Get provider configuration
   */
  private getProviderConfig(name: 'AINFT' | 'ollama'): InferenceProvider {
    const configs: Record<string, InferenceProvider> = {
      AINFT: {
        name: 'AINFT',
        endpoint: 'https://api.ainft.com/v1/chat/completions',
        supportsX402: true,
        model: 'claude-3-5-sonnet',
        priority: 1,
        costPer1KTokens: 0.003,
      },
      ollama: {
        name: 'ollama',
        endpoint: 'http://localhost:11434',
        supportsX402: false,
        model: 'llama3:8b',
        priority: 2,
        costPer1KTokens: 0,
      },
    };

    return configs[name];
  }

  /**
   * Keccak256 hash helper
   */
  private keccak256(data: string): string {
    const { keccak256 } = require('viem');
    return keccak256(('0x' + data) as Hex);
  }

  /**
   * Get current state
   */
  getState(): SurvivalState {
    return { ...this.state };
  }

  /**
   * Get wallet address
   */
  getAddress(): string | null {
    return this.account?.address || null;
  }
}

// CLI entry
if (require.main === module) {
  const config: X402Config = {
    network: (process.env.NETWORK as 'base' | 'baseSepolia') || 'baseSepolia',
    usdcContract: process.env.USDC_CONTRACT || '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    facilitatorUrl: process.env.X402_FACILITATOR || 'https://x402.org/facilitator',
    providers: [],
    thresholds: {
      criticalBalance: 2,
      lowBalance: 5,
      healthyBalance: 20,
    },
  };

  const survival = new X402Survival(config);
  
  survival.initialize()
    .then(() => {
      survival.startSurvivalLoop();
      console.log('Survival loop started. Press Ctrl+C to stop.');
    })
    .catch(console.error);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nStopping survival loop...');
    survival.stopSurvivalLoop();
    process.exit(0);
  });
}
