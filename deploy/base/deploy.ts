/**
 * Axobase Base L2 Deployment Script
 * 
 * Deploys:
 * 1. AxoRegistry - Bot registry
 * 2. AxoBreedingFund - Breeding escrow
 * 3. AxoTombstoneNFT - Death certificates
 * 4. AxoEvolutionPressure - Evolution parameters
 * 5. AxoMemoryAnchor - Memory indexing
 */

import { ethers } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";

// Base L2 USDC Contract
const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

async function main(hre: HardhatRuntimeEnvironment) {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("═══════════════════════════════════════════════════");
  console.log("🅰️  Axobase - Base L2 Deployment");
  console.log("═══════════════════════════════════════════════════");
  console.log("Deployer:", deployer.address);
  console.log("Network:", hre.network.name);
  console.log("");

  // Get USDC address for network
  const usdcAddress = hre.network.name === "base" 
    ? BASE_USDC 
    : BASE_SEPOLIA_USDC;
  console.log("USDC Address:", usdcAddress);
  console.log("");

  // 1. Deploy AxoRegistry
  console.log("1. Deploying AxoRegistry...");
  const AxoRegistry = await hre.ethers.getContractFactory("AxoRegistry");
  const registry = await AxoRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("✅ AxoRegistry deployed to:", registryAddress);
  console.log("");

  // 2. Deploy AxoBreedingFund
  console.log("2. Deploying AxoBreedingFund...");
  const AxoBreedingFund = await hre.ethers.getContractFactory("AxoBreedingFund");
  const breedingFund = await AxoBreedingFund.deploy(usdcAddress);
  await breedingFund.waitForDeployment();
  const breedingFundAddress = await breedingFund.getAddress();
  console.log("✅ AxoBreedingFund deployed to:", breedingFundAddress);
  console.log("");

  // 3. Deploy AxoTombstoneNFT
  console.log("3. Deploying AxoTombstoneNFT...");
  const AxoTombstoneNFT = await hre.ethers.getContractFactory("AxoTombstoneNFT");
  const tombstoneNFT = await AxoTombstoneNFT.deploy(usdcAddress, deployer.address);
  await tombstoneNFT.waitForDeployment();
  const tombstoneAddress = await tombstoneNFT.getAddress();
  console.log("✅ AxoTombstoneNFT deployed to:", tombstoneAddress);
  console.log("");

  // 4. Deploy AxoEvolutionPressure
  console.log("4. Deploying AxoEvolutionPressure...");
  const AxoEvolutionPressure = await hre.ethers.getContractFactory("AxoEvolutionPressure");
  const evolutionPressure = await AxoEvolutionPressure.deploy();
  await evolutionPressure.waitForDeployment();
  const evolutionAddress = await evolutionPressure.getAddress();
  console.log("✅ AxoEvolutionPressure deployed to:", evolutionAddress);
  console.log("");

  // 5. Deploy AxoMemoryAnchor
  console.log("5. Deploying AxoMemoryAnchor...");
  const AxoMemoryAnchor = await hre.ethers.getContractFactory("AxoMemoryAnchor");
  const memoryAnchor = await AxoMemoryAnchor.deploy();
  await memoryAnchor.waitForDeployment();
  const memoryAnchorAddress = await memoryAnchor.getAddress();
  console.log("✅ AxoMemoryAnchor deployed to:", memoryAnchorAddress);
  console.log("");

  // Setup authorizations
  console.log("6. Setting up authorizations...");
  
  // Authorize contracts in registry
  await registry.setAuthorizedMinter(breedingFundAddress, true);
  await registry.setAuthorizedMinter(tombstoneAddress, true);
  console.log("✅ BreedingFund and TombstoneNFT authorized in Registry");

  // Authorize registry in other contracts
  await breedingFund.setAuthorizedCaller(registryAddress, true);
  await tombstoneNFT.setAuthorizedMinter(registryAddress, true);
  await memoryAnchor.setAuthorizedInscriber(registryAddress, true);
  console.log("✅ Registry authorized in all contracts");
  console.log("");

  // Print deployment summary
  console.log("═══════════════════════════════════════════════════");
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("═══════════════════════════════════════════════════");
  console.log("Network:", hre.network.name);
  console.log("USDC:", usdcAddress);
  console.log("");
  console.log("Contracts:");
  console.log("  AxoRegistry:        ", registryAddress);
  console.log("  AxoBreedingFund:    ", breedingFundAddress);
  console.log("  AxoTombstoneNFT:    ", tombstoneAddress);
  console.log("  AxoEvolutionPressure:", evolutionAddress);
  console.log("  AxoMemoryAnchor:    ", memoryAnchorAddress);
  console.log("");

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    usdc: usdcAddress,
    contracts: {
      AxoRegistry: registryAddress,
      AxoBreedingFund: breedingFundAddress,
      AxoTombstoneNFT: tombstoneAddress,
      AxoEvolutionPressure: evolutionAddress,
      AxoMemoryAnchor: memoryAnchorAddress,
    },
  };

  console.log("Deployment Info (JSON):");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  console.log("");

  // Verify contracts if on supported network
  if (hre.network.name !== "hardhat") {
    console.log("⏳ Waiting for block confirmations...");
    await new Promise((resolve) => setTimeout(resolve, 30000));

    console.log("🔍 Verifying contracts...");
    
    const contracts = [
      { name: "AxoRegistry", address: registryAddress, args: [] },
      { name: "AxoBreedingFund", address: breedingFundAddress, args: [usdcAddress] },
      { name: "AxoTombstoneNFT", address: tombstoneAddress, args: [usdcAddress, deployer.address] },
      { name: "AxoEvolutionPressure", address: evolutionAddress, args: [] },
      { name: "AxoMemoryAnchor", address: memoryAnchorAddress, args: [] },
    ];

    for (const contract of contracts) {
      try {
        await hre.run("verify:verify", {
          address: contract.address,
          constructorArguments: contract.args,
        });
        console.log(`✅ ${contract.name} verified`);
      } catch (e) {
        console.log(`⚠️  ${contract.name} verification failed:`, (e as Error).message);
      }
    }
  }

  console.log("");
  console.log("✨ Deployment complete!");
  console.log("═══════════════════════════════════════════════════");
}

// Execute if run directly
if (require.main === module) {
  main(require("hardhat"))
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default main;
