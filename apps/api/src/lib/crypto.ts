import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';

const JWT_SECRET = process.env.JWT_SECRET_KEY || 'your-secret-key-here';

// ============================================================
// Passwords
// ============================================================
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

// ============================================================
// JWT Tokens
// ============================================================
export interface AccessTokenPayload {
  sub: string;
  tenant_id?: string;
  type: 'access';
  iat?: number;
  exp?: number;
}

export interface ChallengeTokenPayload {
  sub: string;
  tenant_id?: string;
  type: '2fa_challenge';
  iat?: number;
  exp?: number;
}

export function signAccessToken(userId: string, tenantId?: string, expiresInMinutes: number = 30): string {
  return jwt.sign(
    { sub: userId, tenant_id: tenantId, type: 'access' },
    JWT_SECRET,
    { expiresIn: `${expiresInMinutes}m` }
  );
}

export function signChallengeToken(userId: string, tenantId?: string, expiresInMinutes: number = 5): string {
  return jwt.sign(
    { sub: userId, tenant_id: tenantId, type: '2fa_challenge' },
    JWT_SECRET,
    { expiresIn: `${expiresInMinutes}m` }
  );
}

export function verifyJwtToken<T = any>(token: string): T {
  return jwt.verify(token, JWT_SECRET) as T;
}

// ============================================================
// TOTP Symmetric Encryption (Fernet Specification Compliant)
// ============================================================
function getFernetKeys(): { signingKey: Buffer; encryptionKey: Buffer } {
  const secret = process.env.TOTP_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error('TOTP_ENCRYPTION_KEY environment variable is missing.');
  }
  const keyBytes = Buffer.from(secret, 'base64');
  if (keyBytes.length !== 32) {
    throw new Error('TOTP_ENCRYPTION_KEY must be a 32-byte base64-encoded key.');
  }
  const signingKey = keyBytes.subarray(0, 16);
  const encryptionKey = keyBytes.subarray(16, 32);
  return { signingKey, encryptionKey };
}

export function encryptSecret(plainText: string): string {
  const { signingKey, encryptionKey } = getFernetKeys();

  const version = Buffer.from([0x80]);
  const timestamp = Buffer.alloc(8);
  const now = BigInt(Math.floor(Date.now() / 1000));
  timestamp.writeBigUInt64BE(now, 0);

  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv('aes-128-cbc', encryptionKey, iv);
  const cipherText = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);

  const basicParts = Buffer.concat([version, timestamp, iv, cipherText]);
  const hmac = crypto.createHmac('sha256', signingKey).update(basicParts).digest();

  const fullToken = Buffer.concat([basicParts, hmac]);
  return fullToken.toString('base64url');
}

export function decryptSecret(token: string): string {
  const { signingKey, encryptionKey } = getFernetKeys();

  const tokenBytes = Buffer.from(token, 'base64url');
  if (tokenBytes.length < 57) {
    // Try standard base64 if not base64url
    const fallbackBytes = Buffer.from(token, 'base64');
    if (fallbackBytes.length >= 57) {
      return decryptFernetBuffer(fallbackBytes, signingKey, encryptionKey);
    }
    throw new Error('Invalid encrypted token length');
  }

  return decryptFernetBuffer(tokenBytes, signingKey, encryptionKey);
}

function decryptFernetBuffer(buffer: Buffer, signingKey: Buffer, encryptionKey: Buffer): string {
  const version = buffer.subarray(0, 1);
  if (version[0] !== 0x80) {
    throw new Error('Invalid Fernet token version');
  }

  const hmacExpected = buffer.subarray(buffer.length - 32);
  const dataToHmac = buffer.subarray(0, buffer.length - 32);

  const hmacCalculated = crypto.createHmac('sha256', signingKey).update(dataToHmac).digest();
  if (!crypto.timingSafeEqual(hmacExpected, hmacCalculated)) {
    throw new Error('Fernet token HMAC verification failed');
  }

  const iv = buffer.subarray(9, 25);
  const cipherText = buffer.subarray(25, buffer.length - 32);

  const decipher = crypto.createDecipheriv('aes-128-cbc', encryptionKey, iv);
  const decrypted = Buffer.concat([decipher.update(cipherText), decipher.final()]);
  return decrypted.toString('utf8');
}

// ============================================================
// TOTP RFC 6238 / otplib
// ============================================================
export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export function getTotpUri(secret: string, email: string, issuer: string = 'Evolix'): string {
  return authenticator.keyuri(email, issuer, secret);
}

export function verifyTotp(secret: string, code: string): boolean {
  return authenticator.check(code, secret);
}

// ============================================================
// Recovery Codes
// ============================================================
export function generateRecoveryCodes(count: number = 8): string[] {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = crypto.randomBytes(8);
    let raw = '';
    for (let j = 0; j < 8; j++) {
      raw += alphabet[bytes[j] % alphabet.length];
    }
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4)}`);
  }
  return codes;
}

export function normalizeRecoveryCode(code: string): string {
  if (!code) return '';
  return code.trim().toUpperCase().replace(/[\s-]/g, '');
}

export function formatRecoveryCode(code: string): string {
  const norm = normalizeRecoveryCode(code);
  if (norm.length === 8) {
    return `${norm.slice(0, 4)}-${norm.slice(4)}`;
  }
  return norm;
}

// ============================================================
// Secure Temporary Password Generation
// ============================================================
export function generateTemporaryPassword(length: number = 16): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // exclude ambiguous I, O
  const lower = 'abcdefghijkmnopqrstuvwxyz'; // exclude ambiguous l
  const numbers = '23456789'; // exclude 0, 1
  const special = '!@#$%^&*()_+-=';
  const all = upper + lower + numbers + special;

  // Guarantee at least 2 of each character class for guaranteed policy compliance
  const chars: string[] = [
    upper[crypto.randomInt(0, upper.length)],
    upper[crypto.randomInt(0, upper.length)],
    lower[crypto.randomInt(0, lower.length)],
    lower[crypto.randomInt(0, lower.length)],
    numbers[crypto.randomInt(0, numbers.length)],
    numbers[crypto.randomInt(0, numbers.length)],
    special[crypto.randomInt(0, special.length)],
    special[crypto.randomInt(0, special.length)],
  ];

  for (let i = chars.length; i < length; i++) {
    chars.push(all[crypto.randomInt(0, all.length)]);
  }

  // Fisher-Yates cryptographically secure shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    const temp = chars[i];
    chars[i] = chars[j];
    chars[j] = temp;
  }

  return chars.join('');
}

