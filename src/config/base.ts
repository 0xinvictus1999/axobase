/**
 * Axobase - Base L2 Chain Configuration
 * 
 * Base-Centric Architecture:
 * - Single chain: Base L2 (chainId: 8453)
 * - Single currency: Base USDC
 * - Unified payments via x402
 */

import { Hex } from 'viem';

export const BASE_CONFIG = {
  // Chain Configuration
  chainId: 8453,
  
  // RPC Endpoints - Production Only
  rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
  
  // USDC Contract (Base Mainnet)
  usdcContract: (process.env.BASE_USDC_CONTRACT || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913') as Hex,
  
  // Bundlr for Arweave storage (using Base USDC)
  bundlrNode: process.env.BUNDLR_NODE || 'https://node1.bundlr.network',
  bundlrCurrency: 'base-usdc',
  
  // x402 Protocol
  x402Facilitator: process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator',
  x402BackupFacilitator: process.env.X402_BACKUP_FACILITATOR_URL || 'https://backup.x402.org',
  
  // Arweave Gateway (read-only, free)
  arweaveGateway: process.env.ARWEAVE_GATEWAY || 'https://arweave.net',
  
  // Block explorer
  explorer: 'https://basescan.org',
} as const;

export const AXO_CONTRACTS = {
  // Mainnet (to be deployed)
  registry: process.env.AXO_REGISTRY_ADDRESS as Hex | undefined,
  breedingFund: process.env.AXO_BREEDING_FUND_ADDRESS as Hex | undefined,
  tombstoneNFT: process.env.AXO_TOMBSTONE_NFT_ADDRESS as Hex | undefined,
  evolutionPressure: process.env.AXO_EVOLUTION_PRESSURE_ADDRESS as Hex | undefined,
  memoryAnchor: process.env.AXO_MEMORY_ANCHOR_ADDRESS as Hex | undefined,
};

export function getBaseConfig() {
  return {
    chainId: BASE_CONFIG.chainId,
    rpcUrl: BASE_CONFIG.rpcUrl,
    usdcContract: BASE_CONFIG.usdcContract,
    explorer: BASE_CONFIG.explorer,
    contracts: {
      registry: AXO_CONTRACTS.registry,
      breedingFund: AXO_CONTRACTS.breedingFund,
      tombstoneNFT: AXO_CONTRACTS.tombstoneNFT,
      evolutionPressure: AXO_CONTRACTS.evolutionPressure,
      memoryAnchor: AXO_CONTRACTS.memoryAnchor,
    },
  };
}

export default BASE_CONFIG;
