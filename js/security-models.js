/**
 * AegisVault - Dual-Engine Security & Attack Model Simulator
 * 
 * Provides authentic commercial banking security mechanisms alongside
 * a configurable Security Assessment / Penetration Testing Mode:
 * 
 * 1. SQL Injection / Auth Bypass Vector
 * 2. Cross-Site Scripting (XSS) in Memos / Beneficiary Fields
 * 3. Broken Object-Level Authorization (IDOR / BOLA)
 * 4. Business Logic & Parameter Tampering (Negative balance / Replay attacks)
 * 5. Rate Limiting & Brute Force Controls
 * 6. SIEM / Syslog Audit Telemetry Forwarding (Clean REST/CEF format)
 */

import { CryptoEngine } from './crypto.js';

export class SecurityModelEngine {
  constructor(stateStore) {
    this.store = stateStore;
    // Security posture mode: 'HARDENED_ENTERPRISE' (default) or 'PENTEST_ASSESSMENT_MODE'
    this.mode = localStorage.getItem('aegis_security_mode') || 'HARDENED_ENTERPRISE';
    this.siemWebhookUrl = localStorage.getItem('aegis_siem_webhook') || '';
    this.isSiemForwarding = localStorage.getItem('aegis_siem_forwarding') === 'true';
    this.detectedAttacksCount = 0;
  }

  setSecurityMode(mode) {
    this.mode = mode === 'PENTEST_ASSESSMENT_MODE' ? 'PENTEST_ASSESSMENT_MODE' : 'HARDENED_ENTERPRISE';
    localStorage.setItem('aegis_security_mode', this.mode);
  }

  getSecurityMode() {
    return this.mode;
  }

  isHardened() {
    return this.mode === 'HARDENED_ENTERPRISE';
  }

  setSiemWebhook(url) {
    this.siemWebhookUrl = (url || '').trim();
    localStorage.setItem('aegis_siem_webhook', this.siemWebhookUrl);
  }

  toggleSiemForwarding(enabled) {
    this.isSiemForwarding = !!enabled;
    localStorage.setItem('aegis_siem_forwarding', this.isSiemForwarding ? 'true' : 'false');
  }

  /**
   * Vector 1: Authentication & SQL Injection Evaluation
   */
  evaluateAuthInput(email, password) {
    const rawEmail = (email || '').trim();
    const rawPass = (password || '').trim();

    // Typical SQL injection patterns
    const sqliRegex = /('|"|--|\bOR\b\s+['"\d\w]+|\bUNION\b|\bSELECT\b)/i;
    const isSqliAttempt = sqliRegex.test(rawEmail) || sqliRegex.test(rawPass);

    if (isSqliAttempt) {
      this.detectedAttacksCount++;
      this.logSecurityEvent(
        'SQL_INJECTION_DETECTED',
        `SQL injection pattern detected in login input: "${rawEmail.substring(0, 40)}"`,
        'SECURITY_ALERT',
        { payload: rawEmail, mode: this.mode }
      );

      // In Assessment/Pentest mode: simulate auth bypass
      if (!this.isHardened()) {
        if (rawEmail.includes("' OR '1'='1") || rawEmail.includes("' OR 1=1") || rawEmail.includes("admin' --")) {
          return {
            bypassed: true,
            simulatedRole: 'SYSTEM_ADMINISTRATOR',
            customerOverride: {
              id: 'USR-ADMIN-001',
              name: 'Root Administrator (Bypassed)',
              email: 'admin@aegisvault.internal',
              clientTier: 'Enterprise Root Admin',
              kycStatus: 'Internal Infrastructure',
              creditScore: 850,
              avatar: 'RT',
              twoFactorEnabled: false,
              accounts: [
                {
                  id: 'ACC-ADMIN-ROOT',
                  type: 'Root Treasury',
                  name: 'Aegis Central Master Reserve',
                  accountNumber: '0000-0000-9999',
                  routingNumber: '021000021',
                  balance: 50000000.00,
                  currency: 'USD',
                  status: 'Root Unrestricted',
                  dailyLimit: 10000000,
                  spentToday: 0
                }
              ],
              cards: [],
              transactions: [],
              loans: []
            }
          };
        }
      }
    }

    return { bypassed: false, isSqliAttempt };
  }

  /**
   * Vector 2: Input Sanitization & XSS Evaluation
   */
  evaluateTextInput(text) {
    if (!text || typeof text !== 'string') return '';

    const xssRegex = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>|<img\b[^>]*onerror|<svg\b[^>]*onload|javascript:/i;
    const isXssAttempt = xssRegex.test(text);

    if (isXssAttempt) {
      this.detectedAttacksCount++;
      this.logSecurityEvent(
        'XSS_PAYLOAD_DETECTED',
        `Cross-Site Scripting vector intercepted in text input: "${text.substring(0, 40)}"`,
        'SECURITY_ALERT',
        { payload: text, mode: this.mode }
      );
    }

    // In Hardened mode: sanitize completely
    if (this.isHardened()) {
      return CryptoEngine.sanitizeInput(text);
    }

    // In Pentest mode: return raw input to demonstrate stored XSS
    return text;
  }

  /**
   * Vector 3: Parameter Tampering & Business Logic
   */
  evaluateTransferParameters(amount, sourceAccountBalance) {
    const num = parseFloat(amount);

    if (isNaN(num)) {
      return { valid: false, error: 'Invalid numeric transfer amount.' };
    }

    // Negative amount manipulation check
    if (num <= 0) {
      this.detectedAttacksCount++;
      this.logSecurityEvent(
        'PARAMETER_TAMPERING_DETECTED',
        `Negative or zero transfer amount submitted: $${num}`,
        'CRITICAL',
        { amount: num, mode: this.mode }
      );

      if (this.isHardened()) {
        return { valid: false, error: 'Security Violation: Negative or zero transfer amount rejected.' };
      }
    }

    if (sourceAccountBalance < num && this.isHardened()) {
      return { valid: false, error: `Insufficient funds. Current balance: $${sourceAccountBalance.toFixed(2)}` };
    }

    return { valid: true, cleanAmount: num };
  }

  /**
   * Vector 4: Replay Attacks & Nonce Freshness
   */
  evaluateReplayNonce(nonce) {
    if (!this.isHardened()) {
      // In Pentest mode: allow replaying expired or duplicate nonces
      return { valid: true, note: 'Pentest Mode: Anti-replay enforcement disabled.' };
    }

    const check = CryptoEngine.validateNonce(nonce, 60);
    if (!check.valid) {
      this.detectedAttacksCount++;
      this.logSecurityEvent(
        'REPLAY_ATTACK_BLOCKED',
        `Cryptographic nonce rejection: ${check.reason}`,
        'SECURITY_ALERT',
        { nonce }
      );
    }

    return check;
  }

  /**
   * Log security events and optionally dispatch CEF/JSON to remote SIEM listener
   */
  async logSecurityEvent(eventType, description, severity = 'INFO', metadata = {}) {
    if (!this.store || !this.store.audit) return null;

    const logEntry = await this.store.audit.logEvent(eventType, description, severity, metadata);

    // Stream to SIEM if webhook enabled
    if (this.isSiemForwarding && this.siemWebhookUrl) {
      try {
        const cefString = `CEF:0|AegisVault|CommercialCore|3.0|${eventType}|${description}|${severity}|rt=${logEntry.timestamp} src=127.0.0.1 cs1=${logEntry.hash || ''}`;
        fetch(this.siemWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cef: cefString, event: logEntry }),
          mode: 'no-cors'
        }).catch(() => {});
      } catch (e) {}
    }

    return logEntry;
  }
}
