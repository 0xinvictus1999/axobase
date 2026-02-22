/**
 * X402Client - Base-Centric Unified Payment Client
 * 
 * All payments via x402 on Base L2:
 * - Compute resources (Akash/Spheron)
 * - Arweave storage (via Bundlr with Base USDC)
 * - AI inference (AINFT)
 */

import axios, { AxiosResponse } from 'axios';
import { Hex } from 'viem';
import { WalletManager } from '../wallet/WalletManager.js';
import BASE_CONFIG from '../config/base.js';
import {
  X402PaymentInfo,
  X402Payment,
  InferenceProvider,
  InferenceResult,
} from '../types/index.js';

export interface X402Config {
  facilitatorUrl: string;
  backupFacilitatorUrl: string;
  maxPrice: number;
  maxRetries: number;
  retryDelayMs: number;
  pollIntervalMs: number;
  pollTimeoutMs: number;
}

export class X402Client {
  private walletManager: WalletManager;
  private geneHash: string;
  private config: X402Config;
  private pendingSettlements: Map<string, any> = new Map();

  constructor(
    walletManager: WalletManager,
    geneHash: string,
    config: Partial<X402Config> = {}
  ) {
    this.walletManager = walletManager;
    this.geneHash = geneHash;
    this.config = {
      facilitatorUrl: BASE_CONFIG.x402Facilitator,
      backupFacilitatorUrl: BASE_CONFIG.x402BackupFacilitator,
      maxPrice: 5.0,
      maxRetries: 3,
      retryDelayMs: 1000,
      pollIntervalMs: 5000,
      pollTimeoutMs: 300000,
      ...config,
    };
  }

  /**
   * Pay for compute resources (Akash/Spheron) via x402
   */
  async payForCompute(
    provider: 'akash' | 'spheron',
    usdcAmount: string,
    deploymentConfig: any
  ): Promise<{ success: boolean; txHash?: Hex; deploymentId?: string }> {


    const providerEndpoints: Record<string, string> = {
      akash: 'https://api.akashnet.io/x402/pay',
      spheron: 'https://api.spheron.network/x402/pay',
    };

    const endpoint = providerEndpoints[provider];
    if (!endpoint) {
      throw new Error(`Unsupported compute provider: ${provider}`);
    }

    try {
      // First request - expect 402
      const initialResponse = await axios.post(endpoint, deploymentConfig, {
        validateStatus: () => true,
      });

      if (initialResponse.status !== 402) {
        // Provider accepted without payment (test mode or prepaid)
        return {
          success: true,
          deploymentId: initialResponse.data.deploymentId,
        };
      }

      // Parse payment required
      const paymentInfo = this.parsePaymentRequired(initialResponse);
      
      // Create and send payment
      const paymentResult = await this.executePayment(endpoint, paymentInfo, deploymentConfig);
      
      return {
        success: true,
        txHash: paymentResult.txHash,
        deploymentId: paymentResult.deploymentId,
      };
    } catch (error) {
      console.error(`[X402] Compute payment failed:`, error);
      throw error;
    }
  }

  /**
   * Pay for Arweave storage via Bundlr using Base USDC
   */
  async payForStorage(
    data: Buffer,
    tags: Record<string, string> = {}
  ): Promise<{ arweaveTxId: string; baseTxHash?: Hex; cost: string }> {


    try {
      // Use Bundlr with Base USDC
      const bundlrUrl = BASE_CONFIG.bundlrNode;
      
      // Get price quote
      const priceResponse = await axios.post(`${bundlrUrl}/price/base-usdc`, {
        bytes: data.length,
      });
      
      const price = priceResponse.data.price;
  

      // Get wallet for signing
      const wallet = this.walletManager.getWallet(this.geneHash);
      if (!wallet) {
        throw new Error(`Wallet not found for ${this.geneHash}`);
      }

      // Check balance
      const balance = await this.walletManager.getUSDCBalance(wallet.address);
      const requiredAmount = BigInt(Math.ceil(parseFloat(price) * 1e6));
      
      if (balance < requiredAmount) {
        throw new Error(`Insufficient USDC balance: ${balance} < ${requiredAmount}`);
      }

      // Upload via Bundlr with x402 payment
      const uploadResponse = await axios.post(
        `${bundlrUrl}/upload`,
        data,
        {
          headers: {
            'Content-Type': 'application/octet-stream',
            'x-bundlr-currency': 'base-usdc',
            'x-axo-gene': this.geneHash,
            ...Object.entries(tags).reduce((acc, [k, v]) => ({ ...acc, [`x-tag-${k}`]: v }), {}),
          },
          validateStatus: () => true,
        }
      );

      if (uploadResponse.status === 402) {
        // Handle x402 payment flow
        const paymentInfo = this.parsePaymentRequired(uploadResponse);
        const paymentResult = await this.executePayment(
          `${bundlrUrl}/upload`,
          paymentInfo,
          data,
          {
            headers: {
              'Content-Type': 'application/octet-stream',
              'x-bundlr-currency': 'base-usdc',
            },
          }
        );

        return {
          arweaveTxId: paymentResult.arweaveTxId || paymentResult.data?.id,
          baseTxHash: paymentResult.txHash,
          cost: price,
        };
      }

      if (uploadResponse.status === 200 || uploadResponse.status === 201) {
        return {
          arweaveTxId: uploadResponse.data.id,
          cost: price,
        };
      }

      throw new Error(`Upload failed: ${uploadResponse.status}`);
    } catch (error) {
      console.error(`[X402] Storage payment failed:`, error);
      throw error;
    }
  }

  /**
   * Pay for AI inference via x402 on Base
   */
  async payForInference(
    provider: InferenceProvider,
    prompt: string,
    options: { temperature?: number; maxTokens?: number } = {}
  ): Promise<InferenceResult> {


    // First request without payment
    const initialResponse = await axios.post(
      provider.url,
      { prompt, ...options },
      { validateStatus: () => true }
    );

    if (initialResponse.status !== 402) {
      // No payment required
      return {
        content: initialResponse.data.result || initialResponse.data,
        model: provider.model,
        tokensUsed: initialResponse.data.tokensUsed || 0,
        cost: BigInt(0),
        txHash: '0x0' as Hex,
      };
    }

    // Parse payment required
    const paymentInfo = this.parsePaymentRequired(initialResponse);
    
    // Execute payment and get result
    const paymentResult = await this.executePayment(provider.url, paymentInfo, {
      prompt,
      ...options,
    });

    return {
      content: paymentResult.data?.result || paymentResult.data,
      model: provider.model,
      tokensUsed: paymentResult.data?.tokensUsed || 0,
      cost: BigInt(Math.ceil(parseFloat(paymentInfo.maxAmountRequired) * 1e6)),
      txHash: paymentResult.txHash,
    };
  }

  /**
   * Execute x402 payment flow
   */
  private async executePayment(
    endpoint: string,
    paymentInfo: X402PaymentInfo,
    requestData: any,
    extraHeaders: Record<string, string> = {}
  ): Promise<{ txHash: Hex; data?: any; arweaveTxId?: string; deploymentId?: string }> {
    const wallet = this.walletManager.getWallet(this.geneHash);
    if (!wallet) {
      throw new Error(`Wallet not found for ${this.geneHash}`);
    }

    // Check price
    const price = parseFloat(paymentInfo.maxAmountRequired);
    if (price > this.config.maxPrice) {
      throw new Error(`Price ${price} exceeds maximum ${this.config.maxPrice}`);
    }

    // Check balance
    const balance = await this.walletManager.getUSDCBalance(wallet.address);
    const requiredAmount = BigInt(Math.ceil(price * 1e6));
    if (balance < requiredAmount) {
      throw new Error(`Insufficient balance: ${balance} < ${requiredAmount}`);
    }

    // Create ERC-3009 signature
    const now = Math.floor(Date.now() / 1000);
    const nonce = `0x${Buffer.from(crypto.randomUUID().replace(/-/g, ''), 'hex').toString('hex')}` as Hex;

    const signature = await this.walletManager.createERC3009Signature(
      wallet.address,
      paymentInfo.beneficiary,
      requiredAmount,
      now - 60,  // validAfter
      now + 60,  // validBefore
      nonce,
      wallet.privateKey
    );

    // Construct payment
    const payment: X402Payment = {
      scheme: 'exact',
      networkId: paymentInfo.networkId,
      payload: {
        signature: `${signature.r}${signature.s.slice(2)}${signature.v.toString(16).padStart(2, '0')}` as Hex,
        authorization: {
          from: wallet.address,
          to: paymentInfo.beneficiary,
          value: paymentInfo.maxAmountRequired,
          validAfter: now - 60,
          validBefore: now + 60,
          nonce,
        },
      },
    };

    const paymentHeader = Buffer.from(JSON.stringify(payment)).toString('base64');

    // Retry request with payment
    const paidResponse = await axios.post(endpoint, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'X-PAYMENT': paymentHeader,
        ...extraHeaders,
      },
      validateStatus: () => true,
    });

    // Check payment response
    const paymentResponse = paidResponse.headers['x-payment-response'];
    if (paymentResponse) {
      const responseData = JSON.parse(
        Buffer.from(paymentResponse, 'base64').toString('utf8')
      );

      if (responseData.status === 'error') {
        throw new Error(`Payment failed: ${responseData.error}`);
      }

      return {
        txHash: responseData.txHash as Hex,
        data: paidResponse.data,
        arweaveTxId: paidResponse.data?.id,
        deploymentId: paidResponse.data?.deploymentId,
      };
    }

    if (paidResponse.status === 200 || paidResponse.status === 201) {
      return {
        txHash: '0x0' as Hex,
        data: paidResponse.data,
        arweaveTxId: paidResponse.data?.id,
        deploymentId: paidResponse.data?.deploymentId,
      };
    }

    throw new Error(`Payment request failed: ${paidResponse.status}`);
  }

  /**
   * Parse 402 Payment Required response
   */
  private parsePaymentRequired(response: AxiosResponse): X402PaymentInfo {
    const paymentInfoHeader = response.headers['x-payment-info'];
    if (!paymentInfoHeader) {
      throw new Error('402 response missing X-PAYMENT-INFO header');
    }

    try {
      const decoded = Buffer.from(paymentInfoHeader, 'base64').toString('utf8');
      const paymentInfo: X402PaymentInfo = JSON.parse(decoded);

      if (paymentInfo.scheme !== 'exact') {
        throw new Error(`Unsupported scheme: ${paymentInfo.scheme}`);
      }

      // Verify Base network
      if (paymentInfo.networkId !== '8453' && paymentInfo.networkId !== '84532') {
        console.warn(`[X402] Unexpected network ID: ${paymentInfo.networkId}`);
      }

      return paymentInfo;
    } catch (error) {
      throw new Error(`Failed to parse payment info: ${(error as Error).message}`);
    }
  }

  /**
   * Get quotes from multiple inference providers
   */
  async getInferenceQuote(providers: InferenceProvider[]): Promise<{
    provider: InferenceProvider;
    price: number;
    estimatedLatency: number;
  }> {
    const quotes = await Promise.all(
      providers.map(async (provider) => {
        try {
          const startTime = Date.now();
          const response = await axios.post(
            `${provider.url}/quote`,
            { prompt: 'test' },
            { timeout: 5000 }
          );
          const latency = Date.now() - startTime;

          return {
            provider,
            price: parseFloat(response.data.price || '0'),
            estimatedLatency: latency,
          };
        } catch {
          return {
            provider,
            price: Infinity,
            estimatedLatency: Infinity,
          };
        }
      })
    );

    const validQuotes = quotes.filter((q) => q.price !== Infinity);
    if (validQuotes.length === 0) {
      throw new Error('No valid quotes received');
    }

    return validQuotes.sort((a, b) => a.price - b.price)[0];
  }

  /**
   * Get pending settlement count
   */
  getPendingCount(): number {
    return this.pendingSettlements.size;
  }
}

export default X402Client;
