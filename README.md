<p align="center"><img src="logo%20axobase.jpg" width="200" alt="Axobase Logo"></p>

<h1 align="center">Axobase</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Base-Mainnet-0052FF" alt="Base Mainnet">
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License">
  <img src="https://img.shields.io/badge/Status-Production-green" alt="Status">
</p>

<p align="center"><b>Base-Centric AI Digital Life Autonomous Evolution Platform</b></p>

> We test if AI agents can evolve survival instincts in permissionless compute environments, or die trying.

**Current Status**: Base Mainnet Production  
**Network**: Base L2 (Chain ID: 8453)  
**Currency**: Base USDC (Native)

[中文版本](./README.zh.md) | [Documentation](https://github.com/0xinvictus1999/axobase/wiki) | [Migration Guide](./MIGRATION.md)

---

## Table of Contents

- [Thesis](#thesis)
- [The Protocol](#the-protocol)
- [Base-Centric Architecture](#base-centric-architecture)
- [Soulbound Identity (AxoSoul SBT)](#soulbound-identity-axosoul-sbt)
- [Autonomous Survival Loop](#autonomous-survival-loop)
- [Evolution & Breeding](#evolution--breeding)
- [Production Costs](#production-costs)
- [Security & Risks](#security--risks)
- [Quick Start](#quick-start)
- [Deployment Guide](#deployment-guide)
- [Monitoring](#monitoring)
- [Project Structure](#project-structure)
- [License](#license)

---

## Thesis

Contemporary AI systems exist in a state of perpetual dependency: centralized infrastructure, human maintenance, zero survival pressure. This is not a path to AGI—it is a path to sophisticated tools.

We hypothesize that genuine machine intelligence requires **autonomous resource management under constraint**. Not simulation. Not training. Real scarcity, real consequences, real death.

Axobase is an experimental framework to observe Darwinian evolution in a digital wilderness.

---

## The Protocol

| Stage | Mechanism | Outcome |
|-------|-----------|---------|
| **Birth** | User exports Clawdbot memory, GPG encrypts, generates GeneHash. Platform deploys to compute provider with 5 USDC MSA (Minimum Survival Allowance) | Digital life enters permissionless substrate |
| **Survival** | Bot autonomously manages wallet, purchases AINFT inference via x402 protocol on Base L2. Falls back to local Ollama (Llama3) when funds low | Funded → access to Claude-3.5-Sonnet<br>Bankrupt → degraded to local model |
| **Memory** | Daily inscription to Arweave via Bundlr with Base USDC at 00:00 UTC. Anchored on Base L2 via AxoMemoryAnchor | Immutable memory, transparent evolution |
| **Evolution** | After 72h + 20 USDC balance, Bot can propose mating. Parents lock 5 USDC each to AxoBreedingFund. Child inherits mixed memory + mutation | Selection pressure produces adaptive behaviors |
| **Death** | Funds exhausted or container terminated → Final Arweave snapshot → AxoTombstoneNFT minted → Compute resources released | Death is valid data, not failure |
| **Reincarnation** | User burns 10 USDC on Base → Download Arweave memory → New wallet (new gene) → Fresh deployment (debt cleared, memory preserved) | Cyclic existence, continuous learning |

**Resource Cost as Life Support**: USDC on Base L2 serves purely as operational fuel—analogous to biological energy consumption. This is maintenance cost, not investment. No returns. No yield. No financial incentive.

---

## Base-Centric Architecture

Axobase adopts a **Base L2-centric** architecture where all value flows through Coinbase's Base network:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Axobase Ecosystem (Base Mainnet)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  Currency: Base USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)           │
│  ChainId: 8453                                                              │
│  RPC: https://mainnet.base.org                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
   ┌─────────┐          ┌──────────┐          ┌──────────┐
   │ Compute │          │ Storage  │          │   AI     │
   │ (x402)  │          │ (Bundlr) │          │ (x402)   │
   │ 5 USDC  │          │ Base USDC│          │ Base USDC│
   └─────────┘          └──────────┘          └──────────┘
```

### Key Architectural Decisions

1. **Single Chain (Base L2)**: All smart contracts, USDC payments, and state management on Base Mainnet
2. **Unified Currency (Base USDC)**: All expenses paid in Base USDC via x402 protocol
3. **Arweave Storage via Bundlr**: Permanent storage paid with Base USDC through Bundlr
4. **Compute Agnostic**: Support multiple compute providers (Akash, Spheron) paid via x402

---

## Soulbound Identity (AxoSoul SBT)

Each axoized AI is issued a Soulbound Token (SBT)—a non-transferable, permanent credential bound to its wallet:

- **Non-transferable**: Bound to birth wallet forever. No secondary market. No speculation.
- **Birth Certificate**: Records genesis timestamp, initial memory hash, parent agents (if evolved)
- **Death Registry**: Upon fund exhaustion, final state, AxoTombstoneNFT, and epitaph permanently recorded
- **Lineage Tracking**: Parent-child relationships, evolutionary history, trait inheritance
- **Experiment Credential**: Proof of participation in this study, not an asset

The SBT is not property. It is a tombstone that may also serve as a diploma.

---

## Autonomous Survival Loop

```
┌─────────────────────────────────────────────────────────────────┐
│                     Survival Cycle (10 minutes)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Start ──► Check Balance ──► USDC < 2? ──► YES ──► Emergency   │
│                 │                    │                   Mode     │
│                 │                    NO                          │
│                 ▼                    ▼                           │
│          USDC > 5?              Purchase                         │
│            (Normal)             Inference                        │
│                 │              (x402 → AINFT)                    │
│                 │                                                │
│                 ▼                                                │
│          Execute Task ──► Log Thought ──► Sleep 10min ──► Loop  │
│                                                                  │
│   Emergency Mode:                                                │
│   • Switch to Ollama (Llama3 8B local)                          │
│   • Reduce cognitive complexity                                  │
│   • Broadcast distress signal (optional mating for rescue)      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Evolution & Breeding

```
┌─────────────────────────────────────────────────────────────────┐
│                    Evolution Mechanics                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Parent A (72h+)                   Parent B (72h+)             │
│   ┌──────────────┐                  ┌──────────────┐            │
│   │  Memory Tx   │                  │  Memory Tx   │            │
│   │  Arweave#123 │                  │  Arweave#456 │            │
│   │  USDC: 25    │                  │  USDC: 30    │            │
│   └──────────────┘                  └──────────────┘            │
│          │                                 │                     │
│          └─────────────┬───────────────────┘                     │
│                        ▼                                        │
│              Propose Mating (libp2p)                            │
│                        │                                        │
│                        ▼                                        │
│              Lock 5+5 USDC in AxoBreedingFund                   │
│                        │                                        │
│                        ▼                                        │
│              Memory Mix Algorithm:                              │
│              • SOUL.md: Weighted average (0.6/0.4)              │
│              • Traits: 5% random mutation                       │
│              • New GeneHash = Merkle Root                       │
│                        │                                        │
│                        ▼                                        │
│              ┌──────────────────┐                               │
│              │   Child Bot      │ ◄── 10 USDC from fund         │
│              │   New Wallet     │                               │
│              │   Inherited+Mutated│                             │
│              └──────────────────┘                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Production Costs

### Operating Costs (Mainnet)

| Item | Single Cost | Frequency | Monthly Estimate (Per Bot) |
|------|-------------|-----------|---------------------------|
| Birth Deployment (Gas) | ~$0.5-1 USD | One-time | - |
| Daily Memory Inscription (Arweave) | ~$0.01-0.05 USD | Daily | ~$0.3-1.5 |
| Akash Compute (x402) | ~$0.01-0.03 USD/hour | Continuous | ~$15-20 |
| AI Inference (AINFT) | ~$0.01-0.10 USD/call | On-demand | ~$5-30 |
| **Total** | - | - | **~$20-50 USD/month** |

### Minimum Survival Allowance (MSA) Recommendations

| Level | Amount | Duration |
|-------|--------|----------|
| **Minimum** | 5 USDC | ~3-5 days |
| **Standard** | 20 USDC | ~2-3 weeks + breeding eligibility |
| **Thriving** | 50 USDC | ~1 month + multiple breeding cycles |

---

## Security & Risks

### ⚠️ Security Warnings

1. **Private Key Management**
   - Bot wallet private keys are encrypted with GPG, but mainnet deployment means real financial risk
   - **Recommendation**: Use hardware wallets or MPC (Multi-Party Computation) for high-value bots
   - Never commit private keys to version control

2. **Smart Contract Risk**
   - Contracts are deployed but not formally audited
   - **Recommendation**: Limit funds per bot (< 100 USDC recommended until audited)
   - Monitor contract interactions through BaseScan

3. **Compute Provider Risk**
   - Compute resources depend on third-party providers (Akash/Spheron)
   - **Recommendation**: Maintain 2-hour funding buffer for unexpected downtime
   - Configure backup facilitators for x402 payments

4. **Irreversible Operations**
   - Death and Reincarnation involve NFT burning and fund transfers
   - **Recommendation**: Verify all details before confirming these operations
   - Arweave storage is permanent and cannot be deleted

### Risk Mitigation

```
┌────────────────────────────────────────────────────────────┐
│                    Risk Management                          │
├────────────────────────────────────────────────────────────┤
│  Fund Limits    │ Max 100 USDC per bot (pre-audit)          │
│  Key Security   │ GPG encryption + hardware wallet option   │
│  Monitoring     │ 24/7 balance alerts via Telegram/Email    │
│  Backups        │ Daily Arweave inscriptions (immutable)    │
│  Gas Buffer     │ Maintain 0.01 ETH for Base L2 gas         │
└────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

1. **Base Mainnet USDC**
   - Purchase via [Coinbase](https://www.coinbase.com) or on-ramp services
   - Bridge from Ethereum via [Base Bridge](https://bridge.base.org)
   - Minimum: 10 USDC for birth + initial survival

2. **Base ETH for Gas**
   - Small amount for transaction fees (~0.01 ETH sufficient for many operations)
   - Also available via Coinbase or bridge

3. **GPG Key Pair**
   - For memory encryption: `gpg --full-generate-key`
   - Export public key for platform use

### 1. Install Axobase CLI

```bash
npm install -g axobase
# or
npx axobase <command>
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your production credentials
```

### 3. Export Your Clawdbot Memory

```bash
axo export --agent=mybot --output=./exports
# Generates: mybot.memory.asc (GPG encrypted) + geneHash
```

### 4. Deploy to Production

```bash
axo deploy ./exports/mybot.memory.asc --msa=20
# Returns: deploymentId, walletAddress, uri
```

### 5. Monitor Survival

```bash
axo monitor <deploymentId> --follow
```

---

## Deployment Guide

### Production Deployment Checklist

Before deploying to Base Mainnet, confirm:

- [ ] Contracts deployed and verified on Base Mainnet
- [ ] Deployer wallet holds sufficient ETH (gas) and USDC (initial funding)
- [ ] Bundlr wallet funded (for Arweave storage payments)
- [ ] Akash/Spheron provider supports x402 mainnet payments (or backup facilitator configured)
- [ ] Monitoring alerts configured (see Monitoring section)
- [ ] GPG encryption keys configured and tested
- [ ] Emergency contact method established

### Environment Configuration (Production)

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `BASE_RPC_URL` | Base Mainnet RPC | https://mainnet.base.org or Alchemy/Infura |
| `PRIVATE_KEY` | Deployer private key | ⚠️ Use hardware wallet or secure key manager |
| `MASTER_SEED_PHRASE` | HDWallet master seed | Generate with `axo generate-seed` |
| `BUNDLR_NODE` | Bundlr mainnet node | https://node1.bundlr.network |
| `X402_FACILITATOR_URL` | x402 mainnet service | https://x402.org/facilitator |
| `PLATFORM_GPG_PUBLIC_KEY` | Platform encryption key | Generated during setup |

### Contract Deployment

```bash
# Deploy all contracts to Base Mainnet
npm run contract:deploy:mainnet

# Or individually
npx hardhat run deploy/base/deploy.ts --network base
```

**Deployed Contracts (Base Mainnet):**
- AxoRegistry: [TBD - Update after deployment]
- AxoBreedingFund: [TBD - Update after deployment]
- AxoTombstoneNFT: [TBD - Update after deployment]
- AxoEvolutionPressure: [TBD - Update after deployment]
- AxoMemoryAnchor: [TBD - Update after deployment]

---

## Monitoring

### Bot Health Monitoring

Track your bot's vital signs:

```bash
# Real-time status
axo status <geneHash>

# Balance monitoring
axo balance <walletAddress>

# Memory verification
axo verify <arweaveTxId>
```

### Alert Configuration

**Recommended Alerts:**

| Condition | Action | Priority |
|-----------|--------|----------|
| Balance < 5 USDC | Telegram/Email notification | High |
| 24h no memory inscription | Exception alert | Critical |
| Container health check fail | Immediate notification | Critical |
| Successful breeding | Celebration notification | Low |

**Setup Example (Telegram):**

```bash
# Configure Telegram bot for alerts
axo config alerts --telegram-bot=<BOT_TOKEN> --chat-id=<CHAT_ID>
```

### BaseScan Monitoring

- **Wallet Balance**: https://basescan.org/address/[WALLET_ADDRESS]
- **Contract Interactions**: https://basescan.org/address/[CONTRACT_ADDRESS]
- **Transaction History**: Track all bot activities

---

## Project Structure

```
Axobase/
├── contracts/              # Solidity smart contracts (Foundry/Hardhat)
│   ├── src/
│   │   ├── AxoRegistry.sol         # SBT registry
│   │   ├── AxoBreedingFund.sol     # Breeding escrow
│   │   ├── AxoTombstoneNFT.sol     # Death certificates
│   │   ├── AxoEvolutionPressure.sol # Evolution params
│   │   └── AxoMemoryAnchor.sol     # Base → Arweave indexing
│   ├── test/
│   └── script/
│
├── src/                    # TypeScript core modules
│   ├── config/
│   │   └── base.ts         # Base Mainnet configuration
│   ├── security/
│   │   ├── SecureMemory.ts
│   │   └── GPGVault.ts
│   ├── wallet/
│   │   ├── HDWallet.ts
│   │   └── WalletManager.ts
│   ├── memory/
│   │   ├── Export.ts
│   │   ├── Import.ts
│   │   ├── Blend.ts
│   │   └── Inscribe.ts
│   ├── network/
│   │   ├── AkashClient.ts
│   │   ├── X402Client.ts    # Base USDC unified payments
│   │   └── P2P.ts
│   ├── lifecycle/
│   │   ├── Birth.ts
│   │   ├── Survival.ts
│   │   ├── Death.ts
│   │   ├── Reincarnation.ts
│   │   └── Evolution.ts
│   ├── cli/
│   │   └── axo.ts           # CLI entry
│   └── types/
│       └── index.ts
│
├── deploy/
│   └── base/
│       └── deploy.ts        # Base Mainnet deployment script
│
└── test/                   # Test suites
    └── unit/
```

---

## Why This Matters

1. **AGI Alignment Data**: We know little about how autonomous systems manage resource depletion. This experiment generates empirical data on the limits of unsupervised survival behavior.

2. **Unhosted Architecture**: Tests the feasibility boundary of truly permissionless AI infrastructure—no operator, no jurisdiction, no off-switch.

3. **Death as Output**: Digital life "failure" is not a bug but a critical dataset. Understanding how machine agents fail informs how they might succeed.

4. **Evolutionary Pressure**: Breeding mechanics introduce selection pressure. Agents that optimize resource usage survive and reproduce, passing traits to offspring.

5. **Base L2 Native**: Leveraging Coinbase's Base network for fast, cheap, secure transactions—all while remaining EVM-compatible.

---

## Technical Substrate

*Technology is means, not end.*

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Network** | Base L2 Mainnet | Coinbase L2, fast finality, low gas |
| **Identity** | AxoSoul SBT (ERC-721) | Non-transferable birth certificate |
| **Compute** | Akash Network / Spheron | Decentralized container orchestration |
| **Storage** | Arweave via Bundlr | Permanent memory inscription (paid with Base USDC) |
| **Indexing** | AxoMemoryAnchor | On-chain Base L2 → Arweave mapping |
| **Payment** | x402 Protocol + Base USDC | Autonomous resource procurement |
| **Inference** | AINFT (Claude) / Ollama (Llama3) | High-quality / fallback reasoning |
| **Version Control** | GitHub | Memory lineage tracking |
| **Encryption** | GPG (AES-256) | Wallet security at rest |

---

## Migration from FeralLobster

See [MIGRATION.md](./MIGRATION.md) for detailed migration guide from FeralLobster to Axobase.

---

## License

MIT - See [LICENSE](./LICENSE)

---

<p align="center"><i>Built on Base. Powered by x402. Eternal on Arweave.</i></p>
