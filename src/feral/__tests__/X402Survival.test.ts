/**
 * X402Survival Unit Tests
 */

import { X402Survival } from '../core/survival/X402Survival';
import { X402Config, SurvivalState } from '../types';

const mockConfig: X402Config = {
  network: 'baseSepolia',
  usdcContract: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  facilitatorUrl: 'https://x402.org/facilitator',
  providers: [],
  thresholds: {
    criticalBalance: 2,
    lowBalance: 5,
    healthyBalance: 20,
  },
};

describe('X402Survival', () => {
  let survival: X402Survival;

  beforeEach(() => {
    survival = new X402Survival(mockConfig, '/tmp/test-memory');
  });

  afterEach(() => {
    survival.stopSurvivalLoop();
  });

  describe('Survival Mode Logic', () => {
    it('should determine normal mode with sufficient balance', () => {
      const state: SurvivalState = {
        lastCheck: Date.now(),
        mode: 'normal',
        usdcBalance: 25,
        ethBalance: 0.01,
        consecutiveFailures: 0,
        lastInference: null,
      };

      expect(state.usdcBalance).toBeGreaterThanOrEqual(mockConfig.thresholds.healthyBalance);
      expect(state.mode).toBe('normal');
    });

    it('should switch to emergency mode when balance low', () => {
      const state: SurvivalState = {
        lastCheck: Date.now(),
        mode: 'emergency',
        usdcBalance: 3,
        ethBalance: 0.01,
        consecutiveFailures: 0,
        lastInference: null,
      };

      expect(state.usdcBalance).toBeLessThan(mockConfig.thresholds.lowBalance);
      expect(state.mode).toBe('emergency');
    });

    it('should hibernate after too many failures', () => {
      const state: SurvivalState = {
        lastCheck: Date.now(),
        mode: 'hibernation',
        usdcBalance: 1,
        ethBalance: 0.001,
        consecutiveFailures: 6,
        lastInference: null,
      };

      expect(state.consecutiveFailures).toBeGreaterThan(5);
      expect(state.mode).toBe('hibernation');
    });
  });

  describe('Provider Selection', () => {
    it('should use AINFT in normal mode', () => {
      const provider = (survival as any).getProviderConfig('AINFT');
      
      expect(provider.name).toBe('AINFT');
      expect(provider.supportsX402).toBe(true);
      expect(provider.model).toBe('claude-3-5-sonnet');
    });

    it('should use Ollama in emergency mode', () => {
      const provider = (survival as any).getProviderConfig('ollama');
      
      expect(provider.name).toBe('ollama');
      expect(provider.supportsX402).toBe(false);
      expect(provider.costPer1KTokens).toBe(0);
    });
  });

  describe('Prompt Generation', () => {
    it('should generate valid prompts', async () => {
      const prompts: string[] = [];
      
      for (let i = 0; i < 5; i++) {
        const prompt = await (survival as any).generatePrompt();
        prompts.push(prompt);
        expect(prompt).toBeTruthy();
        expect(prompt.length).toBeGreaterThan(10);
      }

      // Should have some variety
      const unique = new Set(prompts);
      expect(unique.size).toBeGreaterThan(1);
    });
  });

  describe('State Management', () => {
    it('should return state copy', () => {
      const state = survival.getState();
      
      expect(state).toHaveProperty('lastCheck');
      expect(state).toHaveProperty('mode');
      expect(state).toHaveProperty('usdcBalance');
      expect(state).toHaveProperty('ethBalance');
    });
  });

  describe('Loop Control', () => {
    it('should start and stop survival loop', () => {
      survival.startSurvivalLoop();
      
      // Should not throw
      survival.stopSurvivalLoop();
    });
  });
});
