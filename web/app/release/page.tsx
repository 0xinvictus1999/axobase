'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { keccak256, toBytes } from 'viem'

import { StepIndicator } from '@/components/StepIndicator'
import { IdentifierInput } from '@/components/IdentifierInput'
import { WalletGenerator } from '@/components/WalletGenerator'
import { FundingPanel } from '@/components/FundingPanel'
import { 
  useIsCorrectNetwork, 
  useSoulExists, 
  useRegisterFeral,
  BASE_CHAIN_ID 
} from '@/hooks/useFeralContract'

// ============================================
// Base Mainnet Configuration
// ============================================

export default function ReleasePage() {
  const [step, setStep] = useState(1)
  const [identifier, setIdentifier] = useState({ arweaveId: '', hash: '' })
  const [isValidIdentifier, setIsValidIdentifier] = useState(false)
  const [botWallet, setBotWallet] = useState({ address: '', privateKey: '' })
  const [fundingComplete, setFundingComplete] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  
  const { isConnected } = useAccount()
  const isCorrectNetwork = useIsCorrectNetwork()
  
  const { data: soulExists, isLoading: isCheckingSoul } = useSoulExists(
    identifier.hash ? identifier.hash as `0x${string}` : undefined
  )
  
  const { register, isPending, isSuccess, hash } = useRegisterFeral()

  // 步骤验证
  useEffect(() => {
    if (step === 1 && isConnected && isCorrectNetwork) {
      setStep(2)
    }
  }, [isConnected, isCorrectNetwork, step])

  useEffect(() => {
    if (step === 2 && isValidIdentifier && soulExists === false) {
      setStep(3)
    }
  }, [isValidIdentifier, soulExists, step])

  useEffect(() => {
    if (step === 3 && botWallet.address) {
      setStep(4)
    }
  }, [botWallet.address, step])

  useEffect(() => {
    if (step === 4 && fundingComplete) {
      setStep(5)
    }
  }, [fundingComplete, step])

  const handleValidIdentifier = (arweaveId: string, hash: string) => {
    setIdentifier({ arweaveId, hash })
    setIsValidIdentifier(true)
  }

  const handleWalletGenerated = (address: string, privateKey: string) => {
    setBotWallet({ address, privateKey })
  }

  const handleRelease = async () => {
    if (confirmText !== 'CONFIRM') {
      alert('请输入 CONFIRM 确认释放')
      return
    }

    const memoryHash = keccak256(toBytes(identifier.hash))

    await register({
      memoryHash,
      botWallet: botWallet.address as `0x${string}`,
      arweaveId: identifier.arweaveId,
      initialFunds: '11'
    })
  }

  const getExplorerUrl = (txHash: string) => {
    return `https://basescan.org/tx/${txHash}`
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* 测试网水印 */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500/90 text-black text-center py-1 text-sm font-bold">
        🌐 Base Mainnet 主网
      </div>

      <div className="container mx-auto px-4 pt-16 pb-20 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            释放生命
          </h1>
          <p className="mt-2 text-slate-400">
            Release Your AI into the Wild
          </p>
        </motion.div>

        <StepIndicator currentStep={step} />

        <div className="mt-8 bg-slate-900/50 backdrop-blur rounded-2xl border border-slate-800 p-6 shadow-2xl">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-semibold text-center mb-6">
                  连接您的钱包
                </h2>
                
                <div className="flex justify-center">
                  <ConnectButton showBalance={false} chainStatus="icon" />
                </div>

                {!isConnected && (
                  <p className="text-center text-slate-400 text-sm">
                    请点击上方按钮连接钱包
                  </p>
                )}

                {isConnected && !isCorrectNetwork && (
                  <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                    <p className="text-red-400 text-center font-semibold">
                      ⚠️ 请切换至 Base Sepolia 测试网
                    </p>
                    <p className="text-red-400/70 text-center text-sm mt-2">
                      Chain ID: {BASE_CHAIN_ID}
                    </p>
                  </div>
                )}

                {isConnected && isCorrectNetwork && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-center"
                  >
                    <p className="text-green-400">✓ 钱包已连接</p>
                  </motion.div>
                )}
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h2 className="text-xl font-semibold text-center mb-6">
                  输入标识符
                </h2>
                <IdentifierInput
                  onValidIdentifier={handleValidIdentifier}
                  onCheckStatus={() => {}}
                  isChecking={isCheckingSoul}
                  soulExists={soulExists}
                />
                {soulExists === true && (
                  <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                    <p className="text-red-400 text-center">
                      此标识符已被使用
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h2 className="text-xl font-semibold text-center mb-6">
                  生成 Bot 钱包
                </h2>
                <WalletGenerator
                  onWalletGenerated={handleWalletGenerated}
                  onSubmit={(address) => setStep(4)}
                />
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h2 className="text-xl font-semibold text-center mb-6">
                  为 Bot 充值
                </h2>
                <FundingPanel
                  botWalletAddress={botWallet.address}
                  targetAmount={11}
                  onFundingComplete={() => setFundingComplete(true)}
                />
              </motion.div>
            )}

            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-semibold text-center mb-6">
                  确认释放
                </h2>

                {!isSuccess ? (
                  <>
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <p className="text-yellow-400 text-center">
                        ⚠️ 此操作不可逆
                      </p>
                    </div>

                    <input
                      type="text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="输入 CONFIRM"
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-center"
                    />

                    <button
                      onClick={handleRelease}
                      disabled={isPending || confirmText !== 'CONFIRM'}
                      className="w-full py-4 bg-red-600 rounded-lg font-bold text-white disabled:opacity-50"
                    >
                      {isPending ? '处理中...' : '🔥 释放生命'}
                    </button>

                    {hash && (
                      <a
                        href={getExplorerUrl(hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 text-sm break-all"
                      >
                        {hash}
                      </a>
                    )}
                  </>
                ) : (
                  <div className="text-center space-y-6">
                    <div className="text-6xl">🦞</div>
                    <h3 className="text-2xl font-bold text-green-400">
                      释放成功!
                    </h3>
                    <a
                      href={getExplorerUrl(hash || '')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3 bg-cyan-600 rounded-lg inline-block"
                    >
                      查看区块链浏览器
                    </a>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-8 text-center text-xs text-slate-600">
          <p>Axobase - 去中心化 AI 放养平台</p>
          <p className="mt-1">Network: Base Mainnet (Chain ID: 8453)</p>
        </div>
      </div>
    </main>
  )
}
