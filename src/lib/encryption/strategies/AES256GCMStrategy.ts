import 'server-only';
import crypto from 'crypto';
import { injectable } from 'inversify';
import type { IEncryptionStrategy } from './IEncryptionStrategy';
import type { EncryptedData } from '@/types/encryption';

/**
 * AES-256-GCM encryption strategy
 *
 * Features:
 * - 256-bit key size (AES-256)
 * - Galois/Counter Mode (GCM) for authenticated encryption
 * - 96-bit IV (NIST recommended for GCM)
 * - 128-bit authentication tag
 * - Hardware acceleration via AES-NI on modern CPUs
 *
 * Security properties:
 * - Confidentiality: AES-256 encryption
 * - Integrity: GCM authentication tag
 * - No IV reuse: Random IV generated per encryption
 * - Constant-time operations: Prevents timing attacks
 */
@injectable()
export class AES256GCMStrategy implements IEncryptionStrategy {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keySize = 32; // 256 bits
  private readonly ivSize = 12; // 96 bits (NIST recommended for GCM)
  private readonly authTagSize = 16; // 128 bits

  /**
   * Encrypt plaintext using AES-256-GCM
   */
  async encrypt(plaintext: string, key: Buffer): Promise<EncryptedData> {
    // Validate key size
    if (key.length !== this.keySize) {
      throw new Error(
        `Invalid key size: expected ${this.keySize} bytes, got ${key.length} bytes`
      );
    }

    // Generate random IV (must be unique for each encryption with same key)
    const iv = crypto.randomBytes(this.ivSize);

    // Create cipher
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    // Encrypt data
    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    return {
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      ciphertext
    };
  }

  /**
   * Decrypt ciphertext using AES-256-GCM
   */
  async decrypt(encrypted: EncryptedData, key: Buffer): Promise<string> {
    // Validate key size
    if (key.length !== this.keySize) {
      throw new Error(
        `Invalid key size: expected ${this.keySize} bytes, got ${key.length} bytes`
      );
    }

    // Parse encrypted components
    const iv = Buffer.from(encrypted.iv, 'base64');
    const authTag = Buffer.from(encrypted.authTag, 'base64');

    // Validate IV and auth tag sizes
    if (iv.length !== this.ivSize) {
      throw new Error(
        `Invalid IV size: expected ${this.ivSize} bytes, got ${iv.length} bytes`
      );
    }

    if (authTag.length !== this.authTagSize) {
      throw new Error(
        `Invalid auth tag size: expected ${this.authTagSize} bytes, got ${authTag.length} bytes`
      );
    }

    // Create decipher
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);

    try {
      // Decrypt data
      let plaintext = decipher.update(encrypted.ciphertext, 'base64', 'utf8');
      plaintext += decipher.final('utf8');

      return plaintext;
    } catch (error) {
      // Authentication tag verification failed or decryption error
      throw new Error(
        'Decryption failed: Authentication tag verification failed or data corrupted'
      );
    }
  }

  getAlgorithmName(): string {
    return 'AES-256-GCM';
  }

  getKeySize(): number {
    return this.keySize;
  }

  getIVSize(): number {
    return this.ivSize;
  }
}
