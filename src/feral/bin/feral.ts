#!/usr/bin/env node
/**
 * Axobase CLI
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
    console.error('Usage: axo export --agent=<name> --output=<dir> --gpg-key=<key>');
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
    console.error('Usage: axo deploy --memory=<path> [--msa=5] [--name=<name>]');
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
  

}

async function cmdMonitor(args: string[]): Promise<void> {
  const dseqArg = args.find(a => a.startsWith('--dseq='));
  const followArg = args.find(a => a === '--follow');



  const config: X402Config = {
    network: 'base',
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

  } else {
    // Single check
    const state = survival.getState();

  }
}

async function cmdInscribe(args: string[]): Promise<void> {


  const config: ArweaveConfig = {
    bundlrNode: 'https://node1.bundlr.network',
    currency: 'usdc',
    privateKey: process.env.ARWEAVE_JWK_ENCRYPTED || '',
  };

  const inscriber = new ArweaveInscriber(config);
  await inscriber.initialize();
  
  const inscription = await inscriber.dailyInscribe();
  

}

async function cmdPropose(args: string[]): Promise<void> {
  const targetArg = args.find(a => a.startsWith('--target='));

  if (!targetArg) {
    console.error('Usage: axo propose --target=<dseq>');
    process.exit(1);
  }

  const evolution = new Evolution({});
  const ready = await evolution.checkBreedingReadiness();

  if (!ready) {

    return;
  }

  const targetDseq = targetArg.split('=')[1];
  await evolution.proposeMate(targetDseq);
  

}

async function cmdLegacy(args: string[]): Promise<void> {
  const command = args[0];

  const legacy = new Legacy({});
  await legacy.initialize();

  if (command === 'monitor') {
    legacy.startDeathMonitoring();

  } else if (command === 'check') {
    const record = await legacy.getDeathRecord();

  } else {
    console.log('Usage: axo legacy <monitor|check>');
  }
}

async function cmdResurrect(args: string[]): Promise<void> {
  const tombstoneArg = args.find(a => a.startsWith('--tombstone='));
  const offeringArg = args.find(a => a.startsWith('--offering='));

  if (!tombstoneArg) {
    console.error('Usage: axo resurrect --tombstone=<id> [--offering=10]');
    process.exit(1);
  }

  const legacy = new Legacy({});
  await legacy.initialize();

  const tombstoneId = tombstoneArg.split('=')[1];
  const offering = parseInt(offeringArg?.split('=')[1] || '10');



  const result = await legacy.reincarnate(tombstoneId);
  

}

async function cmdHelp(): Promise<void> {


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
  NETWORK              base (mainnet only)
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
    console.log('Run "axo help" for usage information.');
    process.exit(1);
  }

  try {
    await handler(args);
  } catch (error) {

    process.exit(1);
  }
}

main();
