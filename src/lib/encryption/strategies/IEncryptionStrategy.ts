import 'server-only';
import type { EncryptedData } from '@/types/encryption';

/**
 * Interface for encryption strategy implementations
 * Follows the Strategy Pattern to allow swappable encryption algorithms
 */
export interface IEncryptionStrategy {
  /**
   * Encrypt plaintext data using the provided key
   * @param plaintext - The data to encrypt
   * @param key - The encryption key (must be correct size for algorithm)
   * @returns Encrypted data with IV and authentication tag
   */
  encrypt(plaintext: string, key: Buffer): Promise<EncryptedData>;

  /**
   * Decrypt ciphertext using the provided key
   * @param encrypted - The encrypted data with IV and auth tag
   * @param key - The decryption key
   * @returns Decrypted plaintext
   * @throws Error if authentication fails or decryption fails
   */
  decrypt(encrypted: EncryptedData, key: Buffer): Promise<string>;

  /**
   * Get the algorithm name
   */
  getAlgorithmName(): string;

  /**
   * Get the required key size in bytes
   */
  getKeySize(): number;

  /**
   * Get the IV size in bytes
   */
  getIVSize(): number;
}
