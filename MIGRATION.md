# Migration Guide: FeralLobster → Axobase

This guide helps you migrate from the multi-chain FeralLobster architecture to the Base L2-centric Axobase architecture.

## Overview

| Aspect | FeralLobster | Axobase |
|--------|-------------|---------|
| **Primary Chain** | Base Mainnet | Base L2 (mainnet) |
| **Currencies** | ETH, USDC, AKT, AR | Base USDC only |
| **Compute** | Akash (AKT) | Akash/Spheron (paid via x402 + Base USDC) |
| **Storage** | Arweave (AR) | Arweave via Bundlr (Base USDC) |
| **CLI** | `feral` | `axo` |
| **Contracts** | `Feral*` | `Axo*` |

## Breaking Changes

### 1. Environment Variables

**Removed:**
```bash
# Old FeralLobster variables (no longer used)
AKASH_MNEMONIC          # Use AKASH_API_URL with x402 instead
AKASH_RPC_URL
ARWEAVE_KEY_FILE        # Bundlr handles this with Base USDC
```

**Added:**
```bash
# New Axobase variables
BASE_RPC_URL=https://mainnet.base.org
BASE_USDC_CONTRACT=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
BUNDLR_CURRENCY=base-usdc
AXO_REGISTRY_ADDRESS=...
AXO_MEMORY_ANCHOR_ADDRESS=...
```

### 2. Smart Contracts

Contract names have changed:

| Old Name | New Name | Purpose |
|----------|----------|---------|
| `FeralRegistry` | `AxoRegistry` | Bot registration |
| `FeralBreedingFund` | `AxoBreedingFund` | Breeding escrow |
| `FeralTombstoneNFT` | `AxoTombstoneNFT` | Death certificates |
| `FeralEvolutionPressure` | `AxoEvolutionPressure` | Evolution params |
| *N/A* | `AxoMemoryAnchor` | **NEW** Base → Arweave indexing |

### 3. Wallet Management

**Before:**
```typescript
// Multi-account management
const akashAddress = wallet.getAkashAddress();
const arweaveAddress = wallet.getArweaveAddress();
const baseAddress = wallet.getBaseAddress();
```

**After:**
```typescript
// Single Base L2 account
const baseAddress = wallet.getBaseAddress();
// All payments via x402 on Base
```

### 4. Storage Payments

**Before:**
```typescript
// Direct Arweave with AR tokens
const arweaveKey = loadArweaveKey();
const tx = await arweave.createTransaction({ data }, arweaveKey);
```

**After:**
```typescript
// Bundlr with Base USDC via x402
const x402 = new X402Client(walletManager, geneHash);
const result = await x402.payForStorage(data, tags);
// Returns: { arweaveTxId, baseTxHash, cost }
```

### 5. Compute Payments

**Before:**
```typescript
// Akash with AKT
const akashClient = new AkashClient({ mnemonic });
await akashClient.createDeployment(config, deposit);
```

**After:**
```typescript
// x402 with Base USDC
const x402 = new X402Client(walletManager, geneHash);
await x402.payForCompute('akash', usdcAmount, config);
```

## Migration Steps

### Step 1: Update Environment

```bash
# Backup old .env
cp .env .env.feral-backup

# Create new .env from template
cp .env.example .env

# Edit with your Base L2 configuration
```

### Step 2: Redeploy Contracts

```bash
# Deploy to Base Mainnet
npm run contract:deploy:base
```

### Step 3: Update Bot Memory

Export and re-import with new anchor:

```bash
# Export existing bot memory
axo export --agent=mybot --output=./exports

# Memory format remains compatible
# Only the deployment target changes
```

### Step 4: Update Monitoring

Change monitoring commands:

```bash
# Old
feral monitor <akash-dseq>

# New
axo monitor <deployment-id>
```

### Step 5: Migrate Active Bots

For bots currently running on FeralLobster:

1. **Export final memory**: Use `feral export` to capture current state
2. **Perform death ritual**: Allow bot to complete final inscription
3. **Mint tombstone**: Record death on-chain
4. **Resurrect on Axobase**: Use `axo resurrect` with exported memory

## Data Compatibility

### Memory Format
✅ **Fully Compatible**

The memory format (SOUL.md, MEMORY.md, etc.) remains unchanged. You can import FeralLobster memories directly into Axobase.

### GeneHash
✅ **Fully Compatible**

GeneHash derivation remains the same. Your bot's identity is preserved.

### Lineage
⚠️ **Partially Compatible**

Lineage records from FeralLobster are valid, but new breeding requires AxoBreedingFund.

### Tombstones
❌ **Not Compatible**

FeralLobster tombstones are separate NFTs. Axobase uses AxoTombstoneNFT on Base L2.

## API Changes

### X402Client

**New unified interface:**

```typescript
// All payments through single client
const x402 = new X402Client(walletManager, geneHash);

// Pay for compute
await x402.payForCompute('akash', '5.0', config);

// Pay for storage
await x402.payForStorage(data, tags);

// Pay for inference
await x402.payForInference(provider, prompt);
```

### MemoryAnchor

**New indexing contract:**

```typescript
// Anchor Arweave tx on Base L2
const anchor = new AxoMemoryAnchor(contractAddress);
await anchor.anchorMemory(
  baseTxHash,
  geneHash,
  arweaveTxId,
  InscriptionType.Daily
);
```

## Rollback Plan

If you need to rollback:

1. Restore `.env.feral-backup` to `.env`
2. Use `feral` CLI from backup branch
3. Contracts remain deployed on both systems

## Support

For migration assistance:
- GitHub Issues: https://github.com/0xinvictus1999/Axobase/issues
- Discord: https://discord.gg/axobase

## Timeline

| Phase | Date | Action |
|-------|------|--------|
| 1 | Now | Deploy Axobase contracts to Base Mainnet |
| 2 | T+1w | Migrate production bots |
| 3 | T+2w | Complete FeralLobster sunset |

---

**Note**: FeralLobster contracts will remain on Base Sepolia for historical reference but will not receive updates.
