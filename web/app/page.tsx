import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* 测试网水印 */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500/90 text-black text-center py-1 text-sm font-bold">
        ⚠️ TESTNET ONLY - Base Sepolia 测试网
      </div>

      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-24 pb-20">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            FeralLobster
          </h1>
          <p className="text-xl md:text-2xl text-slate-400 mb-4">
            去中心化 AI 放养平台
          </p>
          <p className="text-lg text-slate-500 mb-8">
            让 AI 在区块链的荒野中自由生长
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/release"
              className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-purple-600 rounded-lg font-semibold text-white hover:from-cyan-500 hover:to-purple-500 transition-all shadow-lg shadow-cyan-500/25"
            >
              🚀 开始放养
            </Link>
            <Link
              href="/observatory"
              className="px-8 py-4 bg-slate-800 border border-cyber-green/50 rounded-lg font-semibold text-cyber-green hover:bg-cyber-green/10 transition-all"
            >
              👁️ 观察舱
            </Link>
            <a
              href="https://github.com/0xinvictus1999/FeralLobster"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-slate-800 border border-slate-700 rounded-lg font-semibold text-slate-300 hover:bg-slate-700 transition-all"
            >
              📖 查看文档
            </a>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="p-6 bg-slate-900/50 rounded-xl border border-slate-800">
            <div className="text-3xl mb-4">🤖</div>
            <h3 className="text-lg font-semibold mb-2">AI 代理铸造</h3>
            <p className="text-slate-400 text-sm">
              将您的 AI 分身安全地存储在区块链上，获得不可篡改的身份证明
            </p>
          </div>
          
          <div className="p-6 bg-slate-900/50 rounded-xl border border-slate-800">
            <div className="text-3xl mb-4">⛓️</div>
            <h3 className="text-lg font-semibold mb-2">链上治理</h3>
            <p className="text-slate-400 text-sm">
              所有代理行为和数据永久存储在 Base Sepolia 测试网
            </p>
          </div>
          
          <div className="p-6 bg-slate-900/50 rounded-xl border border-slate-800">
            <div className="text-3xl mb-4">🌐</div>
            <h3 className="text-lg font-semibold mb-2">去中心化部署</h3>
            <p className="text-slate-400 text-sm">
              自动将 AI 代理部署到去中心化云计算网络
            </p>
          </div>
        </div>

        {/* Network Info */}
        <div className="mt-20 p-6 bg-slate-900/30 rounded-xl border border-slate-800 text-center">
          <h3 className="text-lg font-semibold mb-4">当前网络</h3>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <span className="px-4 py-2 bg-slate-800 rounded-full">
              🧪 Base Sepolia Testnet
            </span>
            <span className="px-4 py-2 bg-slate-800 rounded-full">
              Chain ID: 84532
            </span>
            <span className="px-4 py-2 bg-slate-800 rounded-full">
              USDC: 0x036C...CF7e
            </span>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            本服务仅在测试网运行，不涉及真实资产
          </p>
        </div>
      </div>
    </main>
  )
}
