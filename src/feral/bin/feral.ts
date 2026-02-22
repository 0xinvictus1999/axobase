#!/usr/bin/env node
/**
 * FeralLobster CLI
 * Main entry point for digital life management
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { MemoryExport } from '../core/export/MemoryExport';
import { AkashDeployer } from '../core/deploy/AkashDeployer';
import { X402Survival } from '../core/survival/X402Survival';
import { ArweaveInscriber } from '../core/inscribe/ArweaveInscriber';
import { Evolution } from '../core/evolution/Evolution';
import { Legacy } from '../core/legacy/Legacy';
import { X402Config, ArweaveConfig } from '../types';

const commands: Record<string, (args: string[]) => Promise<void>> = {
  export: cmdExport,
  deploy: cmdDeploy,
  monitor: cmdMonitor,
  inscribe: cmdInscribe,
  propose: cmdPropose,
  legacy: cmdLegacy,
  resurrect: cmdResurrect,
  help: cmdHelp,
};

async function cmdExport(args: string[]): Promise<void> {
  const agentArg = args.find(a => a.startsWith('--agent='));
  const outputArg = args.find(a => a.startsWith('--output='));
  const gpgArg = args.find(a => a.startsWith('--gpg-key='));

  if (!agentArg || !outputArg || !gpgArg) {
    console.error('Usage: feral export --agent=<name> --output=<dir> --gpg-key=<key>');
    process.exit(1);
  }

  const exporter = new MemoryExport({
    agentName: agentArg.split('=')[1],
    memoryDir: './memory',
    outputDir: outputArg.split('=')[1],
    gpgPublicKey: gpgArg.split('=')[1],
  });

  const result = await exporter.exportMemory();
  console.log('\n=== Export Complete ===');
  console.log(`GeneHash: ${result.geneHash}`);
  console.log(`File: ${result.encryptedFile}`);
}

async function cmdDeploy(args: string[]): Promise<void> {
  const memoryArg = args.find(a => a.startsWith('--memory='));
  const msaArg = args.find(a => a.startsWith('--msa='));
  const nameArg = args.find(a => a.startsWith('--name='));

  if (!memoryArg) {
    console.error('Usage: feral deploy --memory=<path> [--msa=5] [--name=<name>]');
    process.exit(1);
  }

  const deployer = new AkashDeployer({});
  const encryptedMemory = memoryArg.split('=')[1];
  const msa = parseInt(msaArg?.split('=')[1] || '5');

  // Generate geneHash from memory file
  const { createHash } = require('crypto');
  const fs = require('fs');
  const memoryContent = fs.readFileSync(encryptedMemory);
  const geneHash = createHash('sha256').update(memoryContent).digest('hex');

  const deployment = await deployer.createDeployment(geneHash, encryptedMemory, msa);
  
  console.log('\n=== Deployment Complete ===');
  console.log(`DSEQ: ${deployment.dseq}`);
  console.log(`Wallet: ${deployment.walletAddress}`);
  console.log(`URI: ${deployment.deploymentUri}`);
}

async function cmdMonitor(args: string[]): Promise<void> {
  const dseqArg = args.find(a => a.startsWith('--dseq='));
  const followArg = args.find(a => a === '--follow');

  console.log('Monitoring survival status...');

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
  await survival.initialize();

  if (followArg) {
    survival.startSurvivalLoop();
    console.log('Survival loop started. Press Ctrl+C to stop.');
  } else {
    // Single check
    const state = survival.getState();
    console.log('\n=== Survival Status ===');
    console.log(`Mode: ${state.mode}`);
    console.log(`USDC Balance: ${state.usdcBalance}`);
    console.log(`ETH Balance: ${state.ethBalance}`);
    console.log(`Last Inference: ${state.lastInference ? new Date(state.lastInference.timestamp).toISOString() : 'Never'}`);
  }
}

async function cmdInscribe(args: string[]): Promise<void> {
  console.log('Performing daily inscription...');

  const config: ArweaveConfig = {
    bundlrNode: 'https://node1.bundlr.network',
    currency: 'usdc',
    privateKey: process.env.ARWEAVE_JWK_ENCRYPTED || '',
  };

  const inscriber = new ArweaveInscriber(config);
  await inscriber.initialize();
  
  const inscription = await inscriber.dailyInscribe();
  
  console.log('\n=== Inscription Complete ===');
  console.log(`Day: ${inscription.dayNumber}`);
  console.log(`Arweave TX: ar://${inscription.arweaveTx}`);
}

async function cmdPropose(args: string[]): Promise<void> {
  const targetArg = args.find(a => a.startsWith('--target='));

  if (!targetArg) {
    console.error('Usage: feral propose --target=<dseq>');
    process.exit(1);
  }

  const evolution = new Evolution({});
  const ready = await evolution.checkBreedingReadiness();

  if (!ready) {
    console.log('Not ready for breeding yet. Requires: 72h survival + 20 USDC');
    return;
  }

  const targetDseq = targetArg.split('=')[1];
  await evolution.proposeMate(targetDseq);
  
  console.log(`\n=== Proposal Sent ===`);
  console.log(`Target: ${targetDseq}`);
}

async function cmdLegacy(args: string[]): Promise<void> {
  const command = args[0];

  const legacy = new Legacy({});
  await legacy.initialize();

  if (command === 'monitor') {
    legacy.startDeathMonitoring();
    console.log('Death monitoring started. Press Ctrl+C to stop.');
  } else if (command === 'check') {
    const record = await legacy.getDeathRecord();
    if (record) {
      console.log('\n=== Death Record ===');
      console.log(`Type: ${record.deathType}`);
      console.log(`Time: ${new Date(record.timestamp).toISOString()}`);
      console.log(`Tombstone: ${record.tombstoneTokenId}`);
    } else {
      console.log('Agent is still alive.');
    }
  } else {
    console.log('Usage: feral legacy <monitor|check>');
  }
}

async function cmdResurrect(args: string[]): Promise<void> {
  const tombstoneArg = args.find(a => a.startsWith('--tombstone='));
  const offeringArg = args.find(a => a.startsWith('--offering='));

  if (!tombstoneArg) {
    console.error('Usage: feral resurrect --tombstone=<id> [--offering=10]');
    process.exit(1);
  }

  const legacy = new Legacy({});
  await legacy.initialize();

  const tombstoneId = tombstoneArg.split('=')[1];
  const offering = parseInt(offeringArg?.split('=')[1] || '10');

  console.log(`Initiating reincarnation for ${tombstoneId}...`);
  console.log(`Burn offering: ${offering} USDC`);

  const result = await legacy.reincarnate(tombstoneId);
  
  console.log('\n=== Reincarnation Complete ===');
  console.log(`New GeneHash: ${result.geneHash}`);
  console.log(`New DSEQ: ${result.dseq}`);
}

async function cmdHelp(): Promise<void> {
  console.log(`
FeralLobster - Digital Life Autonomy Framework

Commands:
  export      Export Clawdbot memory
              --agent=<name> --output=<dir> --gpg-key=<key>

  deploy      Deploy to Akash Network
              --memory=<path> [--msa=5] [--name=<name>]

  monitor     Check survival status
              [--dseq=<dseq>] [--follow]

  inscribe    Perform daily Arweave inscription

  propose     Propose mating to another agent
              --target=<dseq>

  legacy      Manage death and legacy
              <monitor|check>

  resurrect   Reincarnate from tombstone
              --tombstone=<id> [--offering=10]

  help        Show this help message

Environment Variables:
  NETWORK              base or baseSepolia
  BASE_RPC_URL         RPC endpoint
  USDC_CONTRACT        USDC contract address
  AKASH_MNEMONIC       Akash wallet mnemonic
  GPG_PASSPHRASE       For decrypting wallet
  ARWEAVE_JWK_ENCRYPTED  Arweave key (encrypted)
`);
}

// Main entry
async function main(): Promise<void> {
  const [,, command, ...args] = process.argv;

  if (!command || command === 'help') {
    await cmdHelp();
    return;
  }

  const handler = commands[command];
  if (!handler) {
    console.error(`Unknown command: ${command}`);
    console.log('Run "feral help" for usage information.');
    process.exit(1);
  }

  try {
    await handler(args);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
