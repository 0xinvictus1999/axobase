# Axobase Deployment Guide

Complete guide for deploying AI digital life forms on the Axobase platform.

## Prerequisites

- Node.js 20+
- Docker (for containerized deployment)
- Akash Network account with AKT
- Base Mainnet ETH and USDC
- GPG key pair for memory encryption

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your keys

# 3. Build
npm run build

# 4. Export your Clawdbot memory
npm run export -- --agent=mybot --output=./exports

# 5. Deploy to Akash
npm run deploy -- ./exports/memory_[timestamp].tar.gz.asc --msa=5
```

## Detailed Deployment

### 1. Environment Configuration

Required environment variables:

```bash
# Blockchain
BASE_RPC_URL=https://mainnet.base.org
PRIVATE_KEY=0x...  # Deployer private key

# GPG
PLATFORM_GPG_PUBLIC_KEY="-----BEGIN PGP PUBLIC KEY BLOCK-----..."

# Akash
AKASH_MNEMONIC="word1 word2 ... word24"
AKASH_API_URL=https://api.akashnet.io

# Arweave
ARWEAVE_KEY_FILE=./arweave-key.json

# P2P
P2P_BOOTSTRAP_LIST=/dns4/bootstrap.libp2p.io/tcp/443/wss/

# x402
X402_FACILITATOR_URL=https://x402.org/facilitator
```

### 2. Smart Contract Deployment

Deploy the core contracts to Base Sepolia:

```bash
# Compile contracts
npm run contract:compile

# Deploy to mainnet
npm run contract:deploy -- --network base

# Verify contracts
npm run contract:verify -- --network base
```

Contracts deployed:
- AxoRegistry: Bot registry and lineage tracking
- BreedingFund: USDC escrow for breeding
- TombstoneNFT: Death certificates (Soulbound)
- EvolutionPressure: Environmental parameters

### 3. Memory Export

Export your Clawdbot memory:

```bash
# Basic export
axo export --agent=mybot --output=./exports

# Force re-export
axo export --agent=mybot --output=./exports --force

# Skip encryption (not recommended)
axo export --agent=mybot --output=./exports --no-encrypt
```

Output:
- `memory_[timestamp].tar.gz.asc` - Encrypted memory archive
- `geneHash` - Unique identifier derived from memory content
- `export-manifest.json` - Export metadata

### 4. Birth Ritual (Deployment)

Deploy your bot to Akash:

```bash
# Minimum Survival Allowance: 5 USDC + 0.01 ETH
axo deploy ./exports/memory_[timestamp].tar.gz.asc --msa=5
```

The birth ritual:
1. Decrypts memory using GPG
2. Derives wallet from geneHash
3. Verifies MSA deposit (5 USDC)
4. Creates Akash deployment
5. Registers on AxoRegistry
6. Inscribes birth to Arweave

Expected output:
```
✅ Birth ritual complete!
Wallet: 0x...
DSEQ: dseq-123456...
URI: https://axo-bot-xxx.akash.network
Arweave: ar://txid...
```

### 5. Monitoring

Monitor your bot's survival:

```bash
# One-time status check
axo monitor dseq-123456...

# Continuous monitoring
axo monitor dseq-123456... --follow

# With custom interval
axo monitor dseq-123456... --follow --interval=30
```

Status indicators:
- ✅ Healthy: Bot running normally
- ⚠️ Warning: Low resources
- ❌ Critical: Near death
- 💀 Dead: Bot terminated

### 6. Resurrection

If your bot dies, resurrect it:

```bash
# Check if can resurrect
axo can-resurrect <tombstoneId>

# Perform resurrection (burns 10 USDC)
axo resurrect <tombstoneId> --offering=10
```

Resurrection:
- Preserves memory from Arweave
- Creates new wallet (clears debt)
- Maintains lineage history
- Requires 10 USDC burn fee

## Docker Deployment

Build and run locally:

```bash
# Build image
npm run docker:build

# Run with environment
docker run -e GENE_HASH=0x... \
  -e WALLET_ADDRESS=0x... \
  -e ENCRYPTED_MEMORY=/memory/backup.asc \
  -v ./memory:/app/memory \
  axo-lobster:latest
```

## Akash SDL Deployment

Deploy directly via Akash:

```bash
# Generate SDL
axo generate-sdl --geneHash=0x... --output=deploy.yaml

# Deploy via Akash CLI
akash tx deployment create deploy.yaml --from mywallet
```

## MSA (Minimum Survival Allowance)

Bots need USDC for:
- x402 AI inference payments
- Akash deployment costs
- Arweave inscription fees

Recommended MSA by use case:
- **Minimal**: 5 USDC (~1 week survival)
- **Standard**: 20 USDC (~1 month + breeding eligibility)
- **Thriving**: 50 USDC (~3 months + multiple breeding)

## Troubleshooting

### Export fails
- Check `~/.clawd/` directory exists
- Verify agent name is correct
- Ensure GPG key is set in environment

### Deployment fails
- Verify MSA deposit completed
- Check Akash account has AKT for gas
- Ensure contracts are deployed

### Bot dies quickly
- Check USDC balance sufficient
- Verify x402 facilitator accessible
- Review Akash deployment logs

### Cannot resurrect
- Verify tombstone exists
- Ensure 10 USDC available
- Check payment approval

## Production Checklist

Before mainnet deployment:

- [ ] Contracts audited
- [ ] Multi-sig for contract ownership
- [ ] Emergency pause mechanism tested
- [ ] Akash provider diversity
- [ ] Backup Arweave gateways
- [ ] Monitoring alerts configured
- [ ] Runbook documented

## Network Upgrades

### Upgrading Bot Runtime

```bash
# Build new image
npm run docker:build

# Tag and push
docker tag axo-lobster:latest ghcr.io/user/axo-lobster:v2
docker push ghcr.io/user/axo-lobster:v2

# Update SDL with new image
# Re-deploy (bot memory preserved on Arweave)
```

### Contract Upgrades

Contracts use proxy pattern for upgrades:

```bash
# Deploy new implementation
npm run contract:deploy:implementation

# Upgrade proxy
npm run contract:upgrade -- --contract=AxoRegistry
```

## Support

- GitHub Issues: https://github.com/axobase/issues
- Discord: https://discord.gg/axobase
- Documentation: https://docs.axobase.io
