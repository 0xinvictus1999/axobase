/**
 * WalletManager - Blockchain Wallet Management
 * 
 * Handles wallet operations including:
 * - Creating and storing wallets
 * - Signing transactions
 * - Querying balances
 * - Managing USDC on Base chain
 */

import { 
  createPublicClient, 
  createWalletClient, 
  http, 
  parseEther, 
  parseUnits, 
  formatUnits,
  serializeTransaction,
  keccak256,
  Hex,
  TransactionRequest as ViemTxRequest,
} from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { SecureMemory } from '../security/SecureMemory.js';
import { HDWallet } from './HDWallet.js';
import { 
  WalletKeyPair, 
  WalletBalances, 
  TransactionRequest,
  Config,
} from '../types/index.js';

// Minimal USDC ABI for balance and transfer
const USDC_ABI = [
  {
    constant: true,
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
  },
] as const;

// ERC-3009 TransferWithAuthorization ABI
const ERC3009_ABI = [
  {
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
    ],
    name: 'transferWithAuthorization',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export class WalletManager {
  private publicClient: ReturnType<typeof createPublicClient>;
  private network: 'base';
  private usdcContract: Hex;
  private masterWallet: HDWallet;

  // In-memory wallet storage (geneHash -> WalletKeyPair)
  private wallets: Map<string, WalletKeyPair> = new Map();

  constructor(config: { 
    network: 'base';
    rpcUrl?: string;
    usdcContract?: Hex;
    masterSeedPhrase: string;
  }) {
    this.network = config.network || 'base';
    this.usdcContract = config.usdcContract || this.getDefaultUSDCAddress();

    // Initialize public client
    this.publicClient = createPublicClient({
      chain: base,
      transport: http(config.rpcUrl),
    });

    // Initialize master HD wallet
    this.masterWallet = new HDWallet(config.masterSeedPhrase);
  }

  /**
   * Create a new wallet from geneHash
   */
  createWallet(geneHash: string): WalletKeyPair {
    // Derive from master HD wallet
    const keyPair = this.masterWallet.deriveFromGene(geneHash);
    
    // Store in memory (the private key is already in SecureMemory)
    this.wallets.set(geneHash, keyPair);

    return keyPair;
  }

  /**
   * Get existing wallet or create new one
   */
  getOrCreateWallet(geneHash: string): WalletKeyPair {
    const existing = this.wallets.get(geneHash);
    if (existing) {
      return existing;
    }
    return this.createWallet(geneHash);
  }

  /**
   * Get wallet by geneHash
   */
  getWallet(geneHash: string): WalletKeyPair | undefined {
    return this.wallets.get(geneHash);
  }

  /**
   * Get wallet address by geneHash
   */
  getAddress(geneHash: string): Hex | undefined {
    return this.wallets.get(geneHash)?.address;
  }

  /**
   * Sign a transaction using SecureMemory-stored private key
   */
  async signTransaction(
    tx: TransactionRequest,
    securePrivateKey: SecureMemory
  ): Promise<Hex> {
    // Get private key from secure memory
    const privateKeyBuffer = securePrivateKey.getValue();
    const privateKeyHex = `0x${privateKeyBuffer.toString('hex')}` as Hex;

    // Create account from private key
    const account = privateKeyToAccount(privateKeyHex);

    // Create wallet client
    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(),
    });

    // Sign transaction
    const signature = await walletClient.signTransaction({
      to: tx.to,
      value: tx.value,
      data: tx.data,
      gas: tx.gasLimit,
    });

    // Clear temporary private key
    privateKeyBuffer.fill(0);

    return signature;
  }

  /**
   * Get USDC balance for an address
   */
  async getUSDCBalance(address: Hex): Promise<bigint> {
    try {
      const balance = await this.publicClient.readContract({
        address: this.usdcContract,
        abi: USDC_ABI,
        functionName: 'balanceOf',
        args: [address],
      });
      return balance;
    } catch (error) {
      console.error('Failed to get USDC balance:', error);
      return BigInt(0);
    }
  }

  /**
   * Get ETH balance for an address
   */
  async getETHBalance(address: Hex): Promise<bigint> {
    try {
      const balance = await this.publicClient.getBalance({ address });
      return balance;
    } catch (error) {
      console.error('Failed to get ETH balance:', error);
      return BigInt(0);
    }
  }

  /**
   * Get both ETH and USDC balances
   */
  async getBalances(address: Hex): Promise<WalletBalances> {
    const [eth, usdc] = await Promise.all([
      this.getETHBalance(address),
      this.getUSDCBalance(address),
    ]);

    return { eth, usdc };
  }

  /**
   * Get wallet balances by geneHash
   */
  async getWalletBalances(geneHash: string): Promise<WalletBalances | null> {
    const wallet = this.wallets.get(geneHash);
    if (!wallet) {
      return null;
    }
    return this.getBalances(wallet.address);
  }

  /**
   * Create ERC-3009 authorization signature for x402 payments
   */
  async createERC3009Signature(
    from: Hex,
    to: Hex,
    value: bigint,
    validAfter: number,
    validBefore: number,
    nonce: Hex,
    securePrivateKey: SecureMemory
  ): Promise<{ v: number; r: Hex; s: Hex }> {
    // Get private key from secure memory
    const privateKeyBuffer = securePrivateKey.getValue();
    const privateKeyHex = `0x${privateKeyBuffer.toString('hex')}` as Hex;

    // Create account
    const account = privateKeyToAccount(privateKeyHex);

    // EIP-712 typed data for ERC-3009
    const domain = {
      name: 'USD Coin',
      version: '2',
      chainId: this.network === 'base' ? 8453 : 84532,
      verifyingContract: this.usdcContract,
    };

    const types = {
      TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
      ],
    };

    const message = {
      from,
      to,
      value,
      validAfter: BigInt(validAfter),
      validBefore: BigInt(validBefore),
      nonce,
    };

    // Sign typed data
    const signature = await account.signTypedData({
      domain,
      types,
      primaryType: 'TransferWithAuthorization',
      message,
    });

    // Parse signature
    const r = signature.slice(0, 66) as Hex;
    const s = `0x${signature.slice(66, 130)}` as Hex;
    const v = parseInt(signature.slice(130, 132), 16);

    // Clear temporary private key
    privateKeyBuffer.fill(0);

    return { v, r, s };
  }

  /**
   * Transfer USDC (requires wallet to be created first)
   */
  async transferUSDC(
    geneHash: string,
    to: Hex,
    amount: bigint
  ): Promise<Hex> {
    const wallet = this.wallets.get(geneHash);
    if (!wallet) {
      throw new Error(`Wallet not found for geneHash: ${geneHash}`);
    }

    // Get private key from secure memory
    const privateKeyBuffer = wallet.privateKey.getValue();
    const privateKeyHex = `0x${privateKeyBuffer.toString('hex')}` as Hex;

    // Create account
    const account = privateKeyToAccount(privateKeyHex);

    // Create wallet client
    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(),
    });

    // Send transaction
    const hash = await walletClient.writeContract({
      address: this.usdcContract,
      abi: USDC_ABI,
      functionName: 'transfer',
      args: [to, amount],
    });

    // Clear temporary private key
    privateKeyBuffer.fill(0);

    return hash;
  }

  /**
   * Check if address has sufficient balance for operation
   */
  async hasSufficientBalance(
    address: Hex,
    minEth: bigint = parseEther('0.001'),
    minUsdc: bigint = parseUnits('1', 6)
  ): Promise<{ eth: boolean; usdc: boolean }> {
    const balances = await this.getBalances(address);
    return {
      eth: balances.eth >= minEth,
      usdc: balances.usdc >= minUsdc,
    };
  }

  /**
   * Get default USDC contract address for current network
   */
  private getDefaultUSDCAddress(): Hex {
    return this.network === 'base'
      ? '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' // Base mainnet USDC
      : '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base Mainnet USDC
  }

  /**
   * Clear all wallets from memory
   */
  clearAllWallets(): void {
    for (const [geneHash, wallet] of this.wallets) {
      wallet.privateKey.clear();
      this.wallets.delete(geneHash);
    }
  }

  /**
   * Get count of loaded wallets
   */
  getWalletCount(): number {
    return this.wallets.size;
  }

  /**
   * Get all geneHashes
   */
  getAllGeneHashes(): string[] {
    return Array.from(this.wallets.keys());
  }

  /**
   * Cleanup - wipe all sensitive data
   */
  cleanup(): void {
    this.clearAllWallets();
    this.masterWallet.wipe();
  }
}

export default WalletManager;
