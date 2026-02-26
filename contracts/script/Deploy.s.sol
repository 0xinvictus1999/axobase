// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/AxoRite.sol";

/**
 * @title Deploy
 * @dev AxoRite 合约部署脚本
 * @notice 部署�?Base Sepolia 测试�?
 * 
 * 使用方法:
 * 1. 设置环境变量: export PRIVATE_KEY=your_private_key
 * 2. 运行: forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast --verify
 */
contract Deploy is Script {
    
    /// @dev Base Sepolia Chain ID
    uint256 public constant BASE_SEPOLIA_CHAIN_ID = 84532;
    
    /// @dev Base Sepolia USDC 地址
    address public constant USDC_ADDRESS = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

    function run() external {
        // 读取私钥
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        // 读取或设置平台地址 (默认使用部署�?
        address platformAddress = vm.envOr("PLATFORM_ADDRESS", deployer);
        
        
        
        
        
        
        
        
        
        
        // 验证�?ID
        require(
            block.chainid == BASE_SEPOLIA_CHAIN_ID,
            string.concat(
                "Wrong network! Expected Base Sepolia (", 
                vm.toString(BASE_SEPOLIA_CHAIN_ID), 
                "), got (", 
                vm.toString(block.chainid), 
                ")"
            )
        );
        
        // 开始广播交�?
        vm.startBroadcast(deployerPrivateKey);
        
        // 部署合约
        AxoRite feralRite = new AxoRite(platformAddress);
        
        vm.stopBroadcast();
        
        // 输出部署信息
        
        
        
        
        
        
        
        
        
        // 保存部署信息到文�?
        _saveDeployment(address(feralRite), deployer, platformAddress);
        
        // 验证部署
        _verifyDeployment(feralRite);
    }
    
    /**
     * @dev 保存部署信息�?broadcast 目录
     */
    function _saveDeployment(
        address contractAddress,
        address deployer,
        address platformAddress
    ) internal {
        string memory deploymentInfo = string.concat(
            "{\n",
            '  "contract": "AxoRite",', "\n",
            '  "chainId": ', vm.toString(block.chainid), ",\n",
            '  "chainName": "Base Sepolia",', "\n",
            '  "contractAddress": "', vm.toString(contractAddress), '",', "\n",
            '  "deployer": "', vm.toString(deployer), '",', "\n",
            '  "platformAddress": "', vm.toString(platformAddress), '",', "\n",
            '  "usdcAddress": "', vm.toString(USDC_ADDRESS), '",', "\n",
            '  "timestamp": ', vm.toString(block.timestamp), ",\n",
            '  "blockNumber": ', vm.toString(block.number), "\n",
            "}\n"
        );
        
        // 创建 broadcast 目录
        string memory broadcastDir = "./broadcast";
        vm.createDir(broadcastDir, true);
        
        // 保存到文�?
        string memory filename = string.concat(
            broadcastDir, 
            "/deploy-", 
            vm.toString(block.timestamp), 
            ".json"
        );
        
        vm.writeFile(filename, deploymentInfo);
        
    }
    
    /**
     * @dev 验证部署结果
     */
    function _verifyDeployment(AxoRite feralRite) internal view {
        
        
        // 验证 USDC 地址
        require(
            feralRite.usdcAddress() == USDC_ADDRESS,
            "USDC address mismatch!"
        );
        
        
        // 验证合约代码存在
        uint256 codeSize;
        address contractAddr = address(feralRite);
        assembly {
            codeSize := extcodesize(contractAddr)
        }
        require(codeSize > 0, "No contract code deployed!");
        
        
        
    }
}
