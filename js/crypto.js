/**
 * AegisVault - Native Web Cryptography Engine
 * Utilizes window.crypto.subtle for client-side cryptographic security
 */

export const CryptoEngine = {
  // Convert ArrayBuffer to Hex String
  buf2hex(buffer) {
    return [...new Uint8Array(buffer)]
      .map(x => x.toString(16).padStart(2, '0'))
      .join('');
  },

  // Convert Hex String to Uint8Array
  hex2buf(hexString) {
    const bytes = new Uint8Array(Math.ceil(hexString.length / 2));
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hexString.substr(i * 2, 2), 16);
    }
    return bytes;
  },

  // Generate a cryptographically secure random UUID / ID
  generateSecureId(prefix = 'TX') {
    const array = new Uint8Array(8);
    window.crypto.getRandomValues(array);
    return `${prefix}-${this.buf2hex(array).toUpperCase()}`;
  },

  // Generate a random Nonce with timestamp (used for Anti-CSRF / Anti-Replay)
  generateNonce() {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    const randomPart = this.buf2hex(array);
    const timestamp = Date.now();
    return `${timestamp}.${randomPart}`;
  },

  // Validate nonce age to prevent replay attacks (valid for 60 seconds)
  validateNonce(nonce, maxAgeSeconds = 60) {
    if (!nonce || typeof nonce !== 'string') return { valid: false, reason: 'Missing nonce' };
    const parts = nonce.split('.');
    if (parts.length !== 2) return { valid: false, reason: 'Malformed nonce format' };
    const timestamp = parseInt(parts[0], 10);
    if (isNaN(timestamp)) return { valid: false, reason: 'Invalid nonce timestamp' };
    const age = (Date.now() - timestamp) / 1000;
    if (age > maxAgeSeconds) {
      return { valid: false, reason: `Nonce expired (${Math.round(age)}s old, limit ${maxAgeSeconds}s)` };
    }
    if (age < -5) {
      return { valid: false, reason: 'Clock skew / future nonce detected' };
    }
    return { valid: true, age };
  },

  // SHA-256 Hash of string data
  async sha256(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuf = await window.crypto.subtle.digest('SHA-256', data);
    return this.buf2hex(hashBuf);
  },

  // PBKDF2 Key Derivation from PIN/Password + Salt
  async deriveKeyFromPin(pin, saltHex) {
    const encoder = new TextEncoder();
    const pinBuffer = encoder.encode(pin);
    const saltBuffer = this.hex2buf(saltHex);

    const baseKey = await window.crypto.subtle.importKey(
      'raw',
      pinBuffer,
      'PBKDF2',
      false,
      ['deriveKey']
    );

    const aesKey = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: 100000,
        hash: 'SHA-256'
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    return aesKey;
  },

  // AES-256-GCM Encryption
  async encryptData(plainText, key) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plainText);
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM

    const ciphertext = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    return {
      iv: this.buf2hex(iv),
      ciphertext: this.buf2hex(ciphertext)
    };
  },

  // AES-256-GCM Decryption
  async decryptData(encryptedObj, key) {
    try {
      const iv = this.hex2buf(encryptedObj.iv);
      const ciphertext = this.hex2buf(encryptedObj.ciphertext);

      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (e) {
      throw new Error('Decryption failed. Integrity check violated or invalid key.');
    }
  },

  // Strict DOM sanitization to prevent XSS (HTML Entity Encoding)
  sanitizeInput(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
};
