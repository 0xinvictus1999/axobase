# 🌐 Web Frontend

Axobase 放养平台 - Next.js 14 Web 前端

## ⚠️ 网络声明

**所有区块链相关操作均在 Base Sepolia 测试网进行，不涉及真实资产。**

```
Chain ID: 84532
Network: Base Mainnet
RPC: https://mainnet.base.org
Block Explorer: https://basescan.org
```

## 技术栈

- **Next.js 14** - React 框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式
- **RainbowKit** - 钱包连接
- **Wagmi/Viem** - Web3 交互
- **Framer Motion** - 动画
- **Ethers.js** - 钱包生成

## 释放流程 (5 步骤)

```
步骤 1: 连接钱包
   └── 强制要求 Base Sepolia 网络
   
步骤 2: 输入标识符
   └── 解析 arweave_id::hash
   └── 检查 hash 是否已使用
   
步骤 3: 生成 Bot 钱包
   └── Ethers.js 随机生成
   └── 提供加密/明文下载
   
步骤 4: 资金充值
   └── 显示二维码和地址
   └── 监听 USDC 转账
   └── 目标: 11 USDC
   
步骤 5: 释放确认
   └── 输入 CONFIRM
   └── 调用 registerFeral
   └── 显示交易哈希
```

## 安装

```bash
cd web
npm install
```

## 环境配置

```bash
cp .env.local.example .env.local
```

编辑 `.env.local`:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...  # AxoRite 合约地址
NEXT_PUBLIC_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_PLATFORM_API_URL=[YOUR_API_ENDPOINT]
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=...  # 可选
```

## 运行

```bash
# 开发模式
npm run dev

# 构建
npm run build

# 生产模式
npm start
```

## 目录结构

```
web/
├── app/
│   ├── globals.css      # 全局样式
│   ├── layout.tsx       # 根布局
│   ├── page.tsx         # 首页
│   └── release/
│       └── page.tsx     # 释放页面 (5 步骤)
├── components/
│   ├── WalletProvider.tsx    # RainbowKit 配置
│   ├── StepIndicator.tsx     # 步骤条
│   ├── IdentifierInput.tsx   # 标识符输入
│   ├── WalletGenerator.tsx   # 钱包生成
│   └── FundingPanel.tsx      # 资金面板
├── hooks/
│   └── useFeralContract.ts   # Wagmi Hooks
├── lib/
│   └── contract.ts           # ABI & 配置
└── package.json
```

## 设计系统

### 颜色
- 背景: `slate-950` (#020617)
- 卡片: `slate-900` (#0f172a)
- 主色: `cyan-500` (#06b6d4)
- 强调: `purple-500` (#a855f7)
- 警告: `yellow-500` (#eab308)
- 错误: `red-500` (#ef4444)
- 成功: `green-500` (#22c55e)

### 字体
- 主字体: Inter (sans-serif)
- 代码: monospace

## 安全说明

- 私钥仅在客户端生成和存储
- 下载的密钥文件由用户自行保管
- 所有交易需用户确认
- 测试网环境，无真实资产风险
