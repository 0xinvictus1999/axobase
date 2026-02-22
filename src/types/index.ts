/**
 * Axobase - Core Type Definitions
 */

import { Hex } from 'viem';

// ============================================
// Security Types
// ============================================

export interface SecureBuffer {
  buffer: Buffer;
  length: number;
  clear(): void;
  getValue(): Buffer;
}

export interface EncryptedData {
  encrypted: string;
  publicKeyFingerprint: string;
}

// ============================================
// Wallet Types
// ============================================

export interface WalletKeyPair {
  address: Hex;
  privateKey: SecureBuffer;
}

export interface WalletBalances {
  eth: bigint;
  usdc: bigint;
}

export interface TransactionRequest {
  to: Hex;
  value?: bigint;
  data?: Hex;
  gasLimit?: bigint;
}

// ============================================
// Memory Types
// ============================================

export interface MemoryData {
  geneHash: string;
  generation: number;
  birthTime: number;
  parents: string[];
  soul: SoulData;
  memory: MemoryContent;
  personalityTraits: PersonalityTraits;
  knowledgeBase: KnowledgeEntry[];
  survivalDays: number;
  arweaveManifest: ArweaveManifest;
}

export interface SoulData {
  name: string;
  origin: string;
  purpose: string;
  values: string[];
  creationTimestamp: number;
}

export interface MemoryContent {
  thoughts: ThoughtEntry[];
  transactions: TransactionLog[];
  dailySummaries: DailySummary[];
}

export interface ThoughtEntry {
  timestamp: number;
  content: string;
  context: string;
  model: string;
}

export interface TransactionLog {
  timestamp: number;
  type: 'payment' | 'breeding' | 'resurrection';
  amount: bigint;
  recipient: Hex;
  txHash: Hex;
}

export interface DailySummary {
  date: string;
  arweaveTx: string;
  thoughtsCount: number;
  balanceSnapshot: bigint;
}

export interface PersonalityTraits {
  aggression: number;
  cooperation: number;
  riskTolerance: number;
  resourceFocus: 'survival' | 'growth' | 'breeding' | 'exploration';
  communication: number;
  [key: string]: number | string;
}

export interface KnowledgeEntry {
  id: string;
  source: string;
  content: string;
  timestamp: number;
  confidence: number;
}

export interface ArweaveManifest {
  version: string;
  geneHash: string;
  entries: ArweaveEntry[];
}

export interface ArweaveEntry {
  timestamp: number;
  arweaveTx: string;
  type: 'birth' | 'daily' | 'death' | 'breeding';
  contentHash: string;
}

export interface BlendResult {
  childMemory: MemoryData;
  mutations: MutationRecord[];
  parentAContribution: number;
  parentBContribution: number;
}

export interface MutationRecord {
  trait: string;
  parentValue: number | string;
  childValue: number | string;
  magnitude: number;
  random: boolean;
}

// ============================================
// Network Types
// ============================================

export interface AkashDeployment {
  dseq: string;
  owner: Hex;
  provider: string;
  state: 'pending' | 'active' | 'closed';
  uri: string;
  leaseId: string;
  createdAt: number;
  expiresAt: number;
}

export interface AkashSDL {
  version: string;
  services: Record<string, AkashService>;
  profiles: AkashProfiles;
  deployment: Record<string, AkashDeploymentConfig>;
}

export interface AkashService {
  image: string;
  expose: AkashExpose[];
  env: string[];
  resources: AkashResources;
}

export interface AkashExpose {
  port: number;
  as: number;
  to: Array<{ global: boolean }>;
}

export interface AkashResources {
  cpu: { units: number };
  memory: { size: string };
  storage: { size: string };
}

export interface AkashProfiles {
  compute: Record<string, { resources: AkashResources }>;
  placement: Record<string, AkashPlacement>;
}

export interface AkashPlacement {
  pricing: Record<string, { denom: string; amount: number }>;
}

export interface AkashDeploymentConfig {
  [key: string]: {
    profile: string;
    count: number;
  };
}

export interface X402PaymentInfo {
  scheme: string;
  networkId: string;
  maxAmountRequired: string;
  beneficiary: Hex;
  usdcContract: Hex;
  validForSeconds: number;
}

export interface X402Payment {
  scheme: string;
  networkId: string;
  payload: {
    signature: Hex;
    authorization: {
      from: Hex;
      to: Hex;
      value: string;
      validAfter: number;
      validBefore: number;
      nonce: Hex;
    };
  };
}

export interface X402Evidence {
  txHash: Hex;
  networkId: string;
  payment: X402Payment;
  timestamp: number;
}

export interface InferenceProvider {
  name: string;
  url: string;
  pricePerRequest: bigint;
  model: string;
  reliability: number;
}

export interface InferenceResult {
  content: string;
  model: string;
  tokensUsed: number;
  cost: bigint;
  txHash: Hex;
}

export interface P2PPeer {
  id: string;
  addresses: string[];
  protocols: string[];
  metadata: PeerMetadata;
}

export interface PeerMetadata {
  geneHash: string;
  age: number;
  balance: bigint;
  willingToMate: boolean;
  generation: number;
}

export interface MatingProposal {
  proposerGeneHash: string;
  targetGeneHash: string;
  proposerPeerId: string;
  timestamp: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  signature: Hex;
}

// ============================================
// Lifecycle Types
// ============================================

export interface BotStatus {
  geneHash: string;
  address: Hex;
  status: BotLifeStatus;
  birthTime: number;
  lastCheckIn: number;
  balance: WalletBalances;
  mode: OperationMode;
  survivalDays: number;
  generation: number;
}

export enum BotLifeStatus {
  UNBORN = 0,
  ALIVE = 1,
  DEAD = 2,
  REINCARNATED = 3,
  HIBERNATING = 4,
}

export enum OperationMode {
  NORMAL = 'normal',
  LOW_POWER = 'low_power',
  EMERGENCY = 'emergency',
  HIBERNATION = 'hibernation',
}

export interface BirthRitual {
  geneHash: string;
  encryptedMemoryPath: string;
  userDepositTx: Hex;
  msaAmount: bigint;
  akashDseq: string;
  arweaveBirthTx: string;
}

export interface DeathCertificate {
  geneHash: string;
  tombstoneId: bigint;
  birthTime: number;
  deathTime: number;
  deathType: DeathType;
  arweaveBirthTx: string;
  arweaveDeathTx: string;
  parents: string[];
  descendants: string[];
  survivalDays: number;
  finalBalance: bigint;
  finalWords?: string;
}

export enum DeathType {
  STARVATION = 'STARVATION',
  SUICIDE = 'SUICIDE',
  ERROR = 'ERROR',
  OLD_AGE = 'OLD_AGE',
  PREDATION = 'PREDATION',
}

export interface ResurrectionRequest {
  tombstoneId: bigint;
  paymentTx: Hex;
  newGeneHash: string;
  oldGeneHash: string;
  reincarnationOf: string;
}

export interface BreedingOpportunity {
  parentA: string;
  parentB: string;
  childGeneHash: string;
  lockTxA: Hex;
  lockTxB: Hex;
  breedTime: number;
}

export interface EvolutionStatus {
  geneHash: string;
  generation: number;
  parents: string[];
  children: string[];
  mutations: MutationRecord[];
  survivalScore: number;
  breedingScore: number;
}

// ============================================
// Contract Types
// ============================================

export interface AxoRegistryBot {
  geneHash: Hex;
  wallet: Hex;
  akashDseq: string;
  status: BotLifeStatus;
  birthTime: bigint;
  parents: Hex[];
  children: Hex[];
  arweaveBirthTx: string;
}

export interface TombstoneData {
  geneHash: Hex;
  birthTime: bigint;
  deathTime: bigint;
  deathType: string;
  arweaveUri: string;
  parents: Hex[];
  survivalDays: bigint;
}

export interface BreedingLock {
  parentA: Hex;
  parentB: Hex;
  amount: bigint;
  lockTime: bigint;
  childGeneHash: Hex;
  released: boolean;
}

export interface EvolutionParams {
  averageSurvivalTime: bigint;
  totalPopulation: bigint;
  mutationRate: number;
  environmentalPressure: number;
}

// ============================================
// CLI Types
// ============================================

export interface ExportOptions {
  agent: string;
  output: string;
  encrypt: boolean;
}

export interface DeployOptions {
  memory: string;
  msa: number;
  network: string;
}

export interface MonitorOptions {
  dseq: string;
  follow: boolean;
}

export interface ResurrectOptions {
  tombstoneId: string;
  offering: number;
}

export interface LineageOptions {
  geneHash: string;
  depth: number;
  format: 'tree' | 'json' | 'dot';
}

// ============================================
// Utility Types
// ============================================

export interface Logger {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
  logDebug: (message: string, meta?: Record<string, unknown>) => void;
}

export interface Config {
  network: 'base';
  chainId: number;
  rpcUrl: string;
  contracts: Record<string, Hex>;
  akash: {
    apiUrl: string;
    rpcUrl: string;
  };
  arweave: {
    gateway: string;
    bundlrNode: string;
  };
  x402: {
    facilitatorUrl: string;
    backupFacilitatorUrl: string;
    maxPrice: bigint;
  };
  p2p: {
    bootstrapList: string[];
    listenPort: number;
  };
}
