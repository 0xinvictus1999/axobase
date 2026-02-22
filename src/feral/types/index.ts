/**
 * Axobase Digital Life System Types
 * 
 * Core type definitions for the autonomous AI agent ecosystem.
 * All types are designed to support the digital life cycle:
 * Birth → Survival → Evolution → Death → Reincarnation
 */

import { Hex } from 'viem';

// ============================================================================
// Memory Export Types
// ============================================================================

export interface MemoryExportConfig {
  /** Agent name for identification */
  agentName: string;
  /** Directory containing memory files (SOUL.md, MEMORY.md, etc.) */
  memoryDir: string;
  /** GPG public key for encryption (file path or key ID) */
  gpgPublicKey: string;
  /** Output directory for encrypted export */
  outputDir: string;
}

export interface ExportedMemory {
  /** Unique genetic identifier (Merkle Root of memory) */
  geneHash: string;
  /** Path to encrypted memory file (.asc) */
  encryptedFile: string;
  /** Merkle root hash */
  merkleRoot: string;
  /** Export timestamp */
  timestamp: number;
  /** Agent name */
  agentName: string;
}

// ============================================================================
// Akash Deployment Types
// ============================================================================

export interface AkashDeployment {
  /** Deployment sequence number */
  dseq: string;
  /** Wallet address for the agent */
  walletAddress: string;
  /** GPG-encrypted private key */
  walletPrivateKey: string;
  /** Deployment URI for accessing the agent */
  deploymentUri: string;
  /** Current deployment status */
  status: 'pending' | 'active' | 'failed' | 'closed';
  /** Creation timestamp */
  createdAt: number;
}

export interface AkashConfig {
  /** Akash RPC endpoint */
  rpcEndpoint: string;
  /** Chain ID (akashnet-2 for mainnet) */
  chainId: string;
  /** Mnemonic for Akash wallet */
  mnemonic: string;
  /** Path to SDL template file */
  sdlTemplate: string;
  /** Optional provider whitelist */
  providerWhitelist?: string[];
}

export interface DeploymentManifest {
  /** Genetic hash of the agent */
  geneHash: string;
  /** Wallet address */
  walletAddress: string;
  /** Minimum Survival Allowance in USDC (default: 5) */
  msaAmount: number;
  /** Path to encrypted memory file */
  encryptedMemoryPath: string;
  /** x402 payment configuration */
  x402Config: X402Config;
  /** Encrypted Arweave JWK */
  arweaveJWK: string;
}

// ============================================================================
// X402 Survival Types
// ============================================================================

export interface X402Config {
  /** Blockchain network */
  network: 'base';
  /** USDC contract address */
  usdcContract: string;
  /** x402 facilitator URL */
  facilitatorUrl: string;
  /** Available inference providers */
  providers: InferenceProvider[];
  /** Balance thresholds for mode switching */
  thresholds: {
    /** Critical balance - triggers emergency mode */
    criticalBalance: number;
    /** Low balance - warning threshold */
    lowBalance: number;
    /** Healthy balance - normal operation */
    healthyBalance: number;
  };
}

export interface InferenceProvider {
  /** Provider name */
  name: string;
  /** API endpoint */
  endpoint: string;
  /** Whether provider supports x402 payments */
  supportsX402: boolean;
  /** Model identifier */
  model: string;
  /** Priority (lower = higher priority) */
  priority: number;
  /** Cost per 1K tokens in USDC */
  costPer1KTokens: number;
}

export interface SurvivalState {
  /** Last survival check timestamp */
  lastCheck: number;
  /** Current survival mode */
  mode: 'normal' | 'emergency' | 'hibernation';
  /** Current USDC balance */
  usdcBalance: number;
  /** Current ETH balance */
  ethBalance: number;
  /** Consecutive failure count */
  consecutiveFailures: number;
  /** Last inference record */
  lastInference: InferenceRecord | null;
}

export interface InferenceRecord {
  /** Inference timestamp */
  timestamp: number;
  /** Provider name */
  provider: string;
  /** Model used */
  model: string;
  /** Cost in USDC */
  cost: number;
  /** Input prompt */
  prompt: string;
  /** Generated response */
  response: string;
  /** Transaction hash (if x402 payment) */
  txHash?: string;
}

// ============================================================================
// Arweave Inscription Types
// ============================================================================

export interface ArweaveConfig {
  /** Bundlr node URL */
  bundlrNode: string;
  /** Payment currency */
  currency: 'usdc' | 'matic' | 'eth';
  /** Encrypted private key (JWK) */
  privateKey: string;
}

export interface DailyInscription {
  /** Inscription timestamp */
  timestamp: number;
  /** Day number since birth */
  dayNumber: number;
  /** Arweave transaction ID */
  arweaveTx: string;
  /** Inscribed content */
  content: InscriptionContent;
}

export interface InscriptionContent {
  /** AI thoughts from the day */
  thoughts: ThoughtRecord[];
  /** Transaction records */
  transactions: TransactionRecord[];
  /** Survival status at inscription time */
  survivalStatus: SurvivalState;
  /** Agent gene hash */
  geneHash: string;
  /** Agent wallet address */
  walletAddress: string;
}

export interface ThoughtRecord {
  /** Thought timestamp */
  timestamp: number;
  /** Thought content */
  content: string;
  /** What triggered this thought */
  trigger: string;
  /** Model used for generation */
  model: string;
}

export interface TransactionRecord {
  /** Transaction timestamp */
  timestamp: number;
  /** Transaction type */
  type: 'inference' | 'inscription' | 'breeding' | 'other';
  /** Amount spent */
  amount: number;
  /** Currency (USDC/ETH) */
  currency: string;
  /** Blockchain transaction hash */
  txHash: string;
  /** Transaction description */
  description: string;
}

// ============================================================================
// Evolution & Breeding Types
// ============================================================================

export interface EvolutionConfig {
  /** Minimum survival time before breeding (72 hours in ms) */
  minSurvivalTime: number;
  /** Minimum USDC balance for breeding */
  minBalanceForBreeding: number;
  /** Random mutation rate (0.05 = 5%) */
  mutationRate: number;
  /** Breeding fund contract address */
  breedingFundAddress: string;
  /** USDC contribution per parent */
  parentContribution: number;
}

export interface BreedingProposal {
  /** Proposer's DSEQ */
  proposerDseq: string;
  /** Target's DSEQ */
  targetDseq: string;
  /** Proposal timestamp */
  timestamp: number;
  /** Current status */
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
}

export interface Lineage {
  /** Agent's gene hash */
  geneHash: string;
  /** Parent gene hashes */
  parents: string[];
  /** Child gene hashes */
  children: string[];
  /** Birth timestamp */
  birthTime: number;
  /** Generation number (1 = genesis) */
  generation: number;
  /** Mutation records */
  mutations: MutationRecord[];
}

export interface MutationRecord {
  /** Trait name */
  trait: string;
  /** Parent value before mutation */
  parentValue: string;
  /** Child value after mutation */
  childValue: string;
  /** Whether mutation was random */
  random: boolean;
}

export interface ChildInfo {
  /** Child's gene hash */
  geneHash: string;
  /** Child's deployment DSEQ */
  dseq: string;
  /** Child's wallet address */
  walletAddress: string;
  /** Parent gene hashes */
  parents: [string, string];
  /** Birth timestamp */
  birthTime: number;
  /** Inherited traits */
  inheritedTraits: Record<string, string>;
  /** Mutation records */
  mutations: MutationRecord[];
}

// ============================================================================
// Legacy & Death Types
// ============================================================================

export interface DeathConfig {
  /** Tombstone NFT contract address */
  tombstoneNftAddress: string;
  /** USDC cost for resurrection */
  resurrectionCost: number;
  /** Max gas for final Arweave upload */
  finalSnapshotGas: number;
}

export interface DeathRecord {
  /** Gene hash of deceased agent */
  geneHash: string;
  /** Cause of death */
  deathType: 'starvation' | 'suicide' | 'murder' | 'old_age';
  /** Death timestamp */
  timestamp: number;
  /** Final USDC balance */
  finalBalance: number;
  /** Final Arweave transaction */
  finalArweaveTx: string;
  /** Tombstone NFT token ID */
  tombstoneTokenId: string;
}

export interface TombstoneMetadata {
  /** NFT name */
  name: string;
  /** NFT description */
  description: string;
  /** NFT image URI */
  image: string;
  /** NFT attributes */
  attributes: {
    trait_type: string;
    value: string | number;
  }[];
  /** Gene hash */
  geneHash: string;
  /** Birth transaction hash */
  birthTx: string;
  /** Death transaction hash */
  deathTx: string;
  /** Parent gene hashes */
  parents: string[];
  /** Descendant gene hashes */
  descendants: string[];
  /** Days survived */
  survivalDays: number;
  /** Cause of death */
  deathType: string;
  /** Arweave archive URI */
  arweaveArchive: string;
}

// ============================================================================
// Smart Contract Types
// ============================================================================

export interface FeralSoul {
  /** Gene hash */
  geneHash: string;
  /** Bot wallet address */
  botWallet: string;
  /** Birth timestamp */
  birthTime: number;
  /** Whether agent has been immolated */
  isImmolated: boolean;
  /** Arweave metadata ID */
  arweaveId: string;
  /** Initial funds in USDC */
  initialFunds: number;
  /** Parent gene hashes */
  parents: string[];
  /** Generation number */
  generation: number;
}

export interface ContractAddresses {
  feralRite: string;
  breedingFund: string;
  tombstoneNFT: string;
  evolutionPressure: string;
  usdc: string;
}

// ============================================================================
// CLI Types
// ============================================================================

export interface CLIConfig {
  feralHome: string;
  network: 'base';
  privateKeyGPGPassphrase: string;
}

export interface ExportCommandArgs {
  agent: string;
  output: string;
  gpgKey?: string;
}

export interface DeployCommandArgs {
  memory: string;
  msa: number;
  name?: string;
}

export interface MonitorCommandArgs {
  dseq: string;
  follow?: boolean;
}

export interface ResurrectCommandArgs {
  tombstoneId: string;
  offering: number;
}

// ============================================================================
// X402 Payment Types
// ============================================================================

export interface X402Payment {
  /** Payer address */
  from: string;
  /** Payee address */
  to: string;
  /** Amount in wei */
  value: string;
  /** Valid after timestamp */
  validAfter: number;
  /** Valid before timestamp */
  validBefore: number;
  /** Unique nonce */
  nonce: string;
  /** Signature v value */
  v: number;
  /** Signature r value */
  r: Hex;
  /** Signature s value */
  s: Hex;
}

export interface X402PaymentInfo {
  /** Payment scheme (exact = EIP-3009) */
  scheme: 'exact' | string;
  /** Network chain ID */
  networkId: string;
  /** Maximum amount required */
  maxAmountRequired: string;
  /** Resource being purchased */
  resource: string;
  /** Payment recipient */
  beneficiary: string;
  /** USDC contract address */
  usdcContract: string;
  /** How long payment is valid (seconds) */
  validForSeconds?: number;
}

export interface X402Evidence {
  /** Transaction hash */
  txHash: Hex;
  /** Network ID */
  networkId: string;
  /** Payment details */
  payment: X402Payment;
  /** Evidence timestamp */
  timestamp: number;
}
