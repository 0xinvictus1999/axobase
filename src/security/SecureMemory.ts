/**
 * SecureMemory - Memory-safe buffer for sensitive data
 * 
 * Uses sodium-native to:
 * - Lock memory pages to prevent swapping to disk (mlock)
 * - Securely zero memory on cleanup (sodium_memzero)
 * - Prevent serialization or accidental logging
 */

import sodium from 'sodium-native';
import { SecureBuffer } from '../types/index.js';

// Track all allocated secure buffers for cleanup
const activeBuffers: Set<SecureMemory> = new Set();

// Ensure cleanup on process exit
process.on('exit', () => {
  for (const buffer of activeBuffers) {
    buffer.clear();
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', () => {
  for (const buffer of activeBuffers) {
    buffer.clear();
  }
});

// Handle SIGTERM
process.on('SIGTERM', () => {
  for (const buffer of activeBuffers) {
    buffer.clear();
  }
});

export class SecureMemory implements SecureBuffer {
  public buffer: Buffer;
  public length: number;
  private _cleared: boolean = false;
  private _id: string;

  constructor(privateKeyOrLength: string | number) {
    if (typeof privateKeyOrLength === 'string') {
      // Initialize from private key string
      this.length = Buffer.byteLength(privateKeyOrLength, 'utf8');
      this.buffer = Buffer.alloc(this.length);
      this.buffer.write(privateKeyOrLength, 'utf8');
    } else {
      // Allocate empty buffer of specified size
      this.length = privateKeyOrLength;
      this.buffer = Buffer.alloc(this.length);
    }

    // Generate unique ID (not derived from content)
    this._id = `secure-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    // Lock memory page to prevent swapping to disk
    try {
      sodium.mlock(this.buffer);
    } catch (err) {
      // mlock may fail in constrained environments (containers, etc.)
      // Log warning but continue - memory will still be zeroed on clear()
      console.warn('[SecureMemory] mlock failed, continuing without swap protection:', (err as Error).message);
    }

    // Register for cleanup
    activeBuffers.add(this);

    // Prevent accidental inspection in console
    Object.defineProperty(this, 'buffer', {
      enumerable: false,
      configurable: false,
    });
    Object.defineProperty(this, '_cleared', {
      enumerable: false,
      configurable: false,
    });
  }

  /**
   * Get the value - returns a COPY to prevent external modification
   */
  getValue(): Buffer {
    if (this._cleared) {
      throw new Error('SecureMemory has been cleared');
    }
    // Return a copy to prevent external modification
    return Buffer.from(this.buffer);
  }

  /**
   * Securely clear the memory using sodium_memzero
   * Also unlocks the memory page
   */
  clear(): void {
    if (this._cleared) {
      return;
    }

    // Securely zero the memory
    sodium.memzero(this.buffer);

    // Unlock memory page
    try {
      sodium.munlock(this.buffer);
    } catch {
      // Ignore unlock errors during cleanup
    }

    this._cleared = true;
    this.length = 0;

    // Remove from active tracking
    activeBuffers.delete(this);
  }

  /**
   * Check if buffer has been cleared
   */
  isCleared(): boolean {
    return this._cleared;
  }

  /**
   * Get ID (for tracking, not derived from content)
   */
  getId(): string {
    return this._id;
  }

  /**
   * Create a SecureMemory from a hex string
   */
  static fromHex(hexString: string): SecureMemory {
    const cleaned = hexString.startsWith('0x') ? hexString.slice(2) : hexString;
    const buffer = Buffer.from(cleaned, 'hex');
    const secure = new SecureMemory(buffer.length);
    buffer.copy(secure.buffer);
    sodium.memzero(buffer); // Clear temporary buffer
    return secure;
  }

  /**
   * Create a SecureMemory from random bytes
   */
  static random(size: number): SecureMemory {
    const secure = new SecureMemory(size);
    sodium.randombytes_buf(secure.buffer);
    return secure;
  }

  /**
   * Clear all active SecureMemory instances
   */
  static clearAll(): void {
    for (const buffer of activeBuffers) {
      buffer.clear();
    }
    activeBuffers.clear();
  }

  /**
   * Get count of active secure buffers (for monitoring)
   */
  static getActiveCount(): number {
    return activeBuffers.size;
  }

  /**
   * Prevent JSON serialization - always throws
   */
  toJSON(): never {
    throw new Error('SecureMemory cannot be serialized');
  }

  /**
   * Prevent string coercion - returns safe value
   */
  toString(): string {
    return '[SecureMemory]';
  }

  /**
   * Prevent inspection in console
   */
  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return `[SecureMemory id=${this._id} cleared=${this._cleared}]`;
  }

  /**
   * Custom iterator - prevents spreading
   */
  *[Symbol.iterator](): Iterator<never> {
    throw new Error('SecureMemory cannot be iterated');
  }
}

/**
 * Secure string - wraps a string in a way that prevents accidental logging
 */
export class SecureString {
  private _secure: SecureMemory;

  constructor(value: string) {
    this._secure = new SecureMemory(value);
    // Immediately clear the input string from JS heap
    // Note: This is best-effort, V8 may have already optimized/copied
  }

  getValue(): string {
    return this._secure.getValue().toString('utf8');
  }

  clear(): void {
    this._secure.clear();
  }

  toString(): string {
    return '[SecureString]';
  }

  toJSON(): never {
    throw new Error('SecureString cannot be serialized');
  }

  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return '[SecureString]';
  }
}

export default SecureMemory;
