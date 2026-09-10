import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { env } from '../config/env.js';
import { createAppError } from './errors.js';

// AES-256-GCM. Deliberately separate from the argon2 hashing used elsewhere
// in this codebase (refresh tokens, API keys) — those are secrets RootLink
// generates itself and only ever needs to *verify*, never read back, so a
// one-way hash is correct there. A third-party OAuth access/refresh token
// (e.g. a connected FamilySearch account) has to be handed back to that
// third party's API on every call, so it must be stored reversibly.
//
// Output format: `${ivBase64}:${authTagBase64}:${ciphertextBase64}` — the IV
// and auth tag are not secret, only the key is; storing them alongside the
// ciphertext is standard practice for GCM and simplifies decryption to a
// single stored string per token rather than three separate columns.

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV is the recommended size for GCM

function getKey(): Buffer {
  if (!env.TOKEN_ENCRYPTION_KEY) {
    throw createAppError(
      'VALIDATION_ERROR',
      'Token encryption is not configured on this instance. Set TOKEN_ENCRYPTION_KEY to enable it.',
      503,
    );
  }
  const key = Buffer.from(env.TOKEN_ENCRYPTION_KEY, 'base64');
  if (key.length !== 32) {
    throw createAppError(
      'VALIDATION_ERROR',
      'TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes (base64-encoded AES-256 key).',
      503,
    );
  }
  return key;
}

export function encryptToken(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext.toString('base64')}`;
}

export function decryptToken(stored: string): string {
  const key = getKey();
  const parts = stored.split(':');
  if (parts.length !== 3) {
    throw createAppError('VALIDATION_ERROR', 'Malformed encrypted token.', 500);
  }
  const [ivB64, authTagB64, ciphertextB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}
