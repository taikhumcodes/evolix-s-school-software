import crypto from 'crypto';
import { CommunicationChannel } from '@prisma/client';

function getEncryptionKey(): Buffer {
  const raw = process.env.COMMUNICATION_ENCRYPTION_KEY || process.env.TOTP_ENCRYPTION_KEY;
  if (raw && /^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex');
  }
  if (raw) {
    return crypto.createHash('sha256').update(raw).digest();
  }
  return Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex');
}

const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypts sensitive destination (phone / email) at rest (Rule 15)
 */
export function encryptDestination(plainText: string): string {
  if (!plainText) return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag().toString('hex');
  // Format: iv:tag:ciphertext
  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

/**
 * Decrypts sensitive destination for provider delivery
 */
export function decryptDestination(encryptedText: string): string {
  if (!encryptedText) return '';
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    // If not in encrypted format (e.g. legacy plain text), return as is
    return encryptedText;
  }

  const [ivHex, tagHex, ciphertextHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Masks destination for safe UI display, list views, and exports (Rule 15, 55, 56)
 * Examples:
 * Phone: "+919876543210" -> "******3210"
 * Email: "student.parent@example.com" -> "s***t@example.com"
 */
export function maskDestination(destination: string, channel?: CommunicationChannel): string {
  if (!destination) return '';
  const clean = destination.trim();

  // If email or channel is EMAIL
  if (clean.includes('@') || channel === 'EMAIL') {
    const [localPart, domain] = clean.split('@');
    if (!domain) return '***';
    if (localPart.length <= 2) {
      return `${localPart[0]}***@${domain}`;
    }
    return `${localPart[0]}***${localPart[localPart.length - 1]}@${domain}`;
  }

  // If phone or digits
  const digitsOnly = clean.replace(/\D/g, '');
  if (digitsOnly.length >= 4) {
    const last4 = digitsOnly.slice(-4);
    return `******${last4}`;
  }

  return '******';
}
