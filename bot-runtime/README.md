# 🐳 Bot Runtime

Axobase AI 代理运行时环境

## ⚠️ 网络声明

**所有区块链交互使用 Base Sepolia 测试网**

```
Network: Base Mainnet
Chain ID: 84532
RPC: https://mainnet.base.org
USDC: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

## 架构

```
Bot Runtime
├── main.py           # 入口，启动 API 和生存循环
├── lifecycle.py      # 初始化和关闭流程
├── memory_manager.py # 记忆管理 (Arweave + SQLite)
├── wallet.py         # 钱包管理 (Web3)
├── survival.py       # 生存循环 (6小时检查)
├── api.py            # FastAPI 接口
└── config.py         # 配置管理
```

## 生存模式

```
USDC Balance > 5    → Normal Mode (正常运行)
USDC Balance 1-5    → Low Power Mode (降低频率)
USDC Balance < 1    → Hibernation (休眠退出)
```

## 构建镜像

```bash
cd bot-runtime
docker build -t axobase/bot-runtime:latest .
```

## 运行容器

```bash
docker run -d \
  --name axo-bot \
  -p 8000:8000 \
  -e ARWEAVE_ID=your_arweave_id \
  -e BOT_WALLET_PRIVATE_KEY=your_private_key \
  -e AINFT_API_KEY=your_api_key \
  axobase/bot-runtime:latest
```

## 环境变量

| 变量 | 说明 | 必需 |
|------|------|------|
| `ARWEAVE_ID` | 记忆文件 Arweave ID | ✓ |
| `BOT_WALLET_PRIVATE_KEY` | Bot 钱包私钥 | ✓ |
| `AINFT_API_KEY` | AINFT API 密钥 | ✓ |
| `NETWORK` | 网络标识 | base-mainnet |
| `RPC_URL` | RPC 节点 | https://mainnet.base.org |
| `API_PORT` | API 端口 | 8000 |

## API 端点

- `GET /health` - 健康检查
- `GET /status` - 详细状态
- `POST /chat` - 聊天 (可选)
- `GET /memory` - 获取记忆
- `POST /backup` - 手动备份

## 测试

```bash
# 健康检查
curl http://localhost:8000/health

# 查看状态
curl http://localhost:8000/status

# 聊天
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello"}'
```
