import { Request } from 'express';

function parseIpv4(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let num = 0;
  for (const p of parts) {
    const n = parseInt(p, 10);
    if (isNaN(n) || n < 0 || n > 255) return null;
    num = (num << 8) + n;
  }
  return num >>> 0;
}

export function isIpInCidr(ipStr: string, cidrStr: string): boolean {
  try {
    const [range, bitsStr] = cidrStr.trim().split('/');
    if (!range) return false;

    // Direct exact match
    if (!bitsStr) {
      return ipStr.trim() === range.trim();
    }

    const bits = parseInt(bitsStr, 10);
    if (isNaN(bits) || bits < 0 || bits > 32) return false;

    const ipNum = parseIpv4(ipStr.trim().replace(/^::ffff:/, ''));
    const rangeNum = parseIpv4(range.trim().replace(/^::ffff:/, ''));
    if (ipNum === null || rangeNum === null) return false;

    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (ipNum & mask) === (rangeNum & mask);
  } catch {
    return false;
  }
}

export function isTrustedProxy(ipStr: string): boolean {
  const trustedCidrs = (process.env.TRUSTED_PROXY_CIDRS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (trustedCidrs.length === 0) {
    return false;
  }

  for (const cidr of trustedCidrs) {
    if (isIpInCidr(ipStr, cidr)) {
      return true;
    }
  }
  return false;
}

export function getClientIp(req: Request): string {
  // 1. Direct peer IP
  let peerIp = req.socket.remoteAddress || '127.0.0.1';
  if (peerIp.startsWith('::ffff:')) {
    peerIp = peerIp.substring(7);
  }

  // 2. If direct peer is not trusted, return direct peer IP
  if (!isTrustedProxy(peerIp)) {
    return peerIp;
  }

  // 3. If direct peer is trusted, inspect forwarded headers
  const forwarded = req.headers['forwarded'];
  if (typeof forwarded === 'string') {
    for (const part of forwarded.split(';')) {
      const trimmed = part.trim();
      if (trimmed.toLowerCase().startsWith('for=')) {
        const val = trimmed.slice(4).trim().replace(/^["[]|["\]]$/g, '');
        if (val) return val;
      }
    }
  }

  const xForwardedFor = req.headers['x-forwarded-for'];
  if (typeof xForwardedFor === 'string') {
    const ips = xForwardedFor.split(',').map((ip) => ip.trim()).filter(Boolean);
    if (ips.length > 0) return ips[0];
  } else if (Array.isArray(xForwardedFor) && xForwardedFor.length > 0) {
    return xForwardedFor[0];
  }

  const xRealIp = req.headers['x-real-ip'];
  if (typeof xRealIp === 'string' && xRealIp.trim()) {
    return xRealIp.trim();
  }

  return peerIp;
}
