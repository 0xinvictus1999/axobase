'use client'

import { useReadContract, useWriteContract, useAccount, useChainId } from 'wagmi'
import { CONTRACT_ADDRESS, AXO_RITE_ABI, BASE_CHAIN_ID } from '@/lib/contract'
import { parseUnits } from 'viem'

// ============================================
// AxoRite 合约 Hooks
// Base Mainnet Configuration
// ============================================

export interface FeralSoul {
  memoryHash: `0x${string}`
  botWallet: `0x${string}`
  birthTime: bigint
  isImmolated: boolean
  arweaveId: string
  initialFunds: bigint
}

export interface RegisterFeralArgs {
  memoryHash: `0x${string}`
  botWallet: `0x${string}`
  arweaveId: string
  initialFunds: string // USDC amount (human readable)
}

/**
 * 检查是否在正确的网络上 (Base Sepolia)
 */
export function useIsCorrectNetwork(): boolean {
  const chainId = useChainId()
  return chainId === BASE_CHAIN_ID
}

/**
 * 获取 FeralSoul 状态
 */
export function useGetFeralStatus(memoryHash?: `0x${string}`) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: AXO_RITE_ABI,
    functionName: 'getFeralStatus',
    args: memoryHash ? [memoryHash] : undefined,
    query: {
      enabled: !!memoryHash && memoryHash !== '0x',
    }
  })
}

/**
 * 检查 Soul 是否存在
 */
export function useSoulExists(memoryHash?: `0x${string}`) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: AXO_RITE_ABI,
    functionName: 'soulExists',
    args: memoryHash ? [memoryHash] : undefined,
    query: {
      enabled: !!memoryHash && memoryHash !== '0x',
    }
  })
}

/**
 * 通过钱包地址获取 Soul
 */
export function useGetSoulByWallet(botWallet?: `0x${string}`) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: AXO_RITE_ABI,
    functionName: 'getSoulByWallet',
    args: botWallet ? [botWallet] : undefined,
    query: {
      enabled: !!botWallet && botWallet !== '0x',
    }
  })
}

/**
 * 注册 FeralSoul
 */
export function useRegisterFeral() {
  const { writeContract, isPending, isSuccess, isError, error, data } = useWriteContract()

  const register = async (args: RegisterFeralArgs) => {
    if (!CONTRACT_ADDRESS) {
      throw new Error('Contract address not configured')
    }

    // 转换 initialFunds 为 USDC (6 decimals)
    const initialFundsWei = parseUnits(args.initialFunds, 6)

    writeContract({
      address: CONTRACT_ADDRESS,
      abi: AXO_RITE_ABI,
      functionName: 'registerFeral',
      args: [
        args.memoryHash,
        args.botWallet,
        args.arweaveId,
        initialFundsWei
      ]
    })
  }

  return {
    register,
    isPending,
    isSuccess,
    isError,
    error,
    hash: data
  }
}

/**
 * 检查钱包是否已连接
 */
export function useWalletConnected(): boolean {
  const { isConnected } = useAccount()
  return isConnected
}

/**
 * 获取当前连接的钱包地址
 */
export function useWalletAddress(): `0x${string}` | undefined {
  const { address } = useAccount()
  return address
}
