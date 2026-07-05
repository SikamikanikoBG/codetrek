// Human-typeable link codes and opaque per-device tokens. Codes deliberately
// avoid characters a kid could confuse (0/O, 1/I/L) — see PRODUCT.md's
// "pre-reader up through fluent reader" audience.

import crypto from 'node:crypto';

const LINK_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const LINK_CODE_LENGTH = 6;
const DEVICE_TOKEN_BYTES = 32;

export function generateLinkCode(): string {
  let code = '';
  for (let i = 0; i < LINK_CODE_LENGTH; i++) {
    code += LINK_CODE_ALPHABET[crypto.randomInt(LINK_CODE_ALPHABET.length)];
  }
  return code;
}

export function generateDeviceToken(): string {
  return crypto.randomBytes(DEVICE_TOKEN_BYTES).toString('hex');
}
