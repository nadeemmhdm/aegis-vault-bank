/**
 * AegisVault - Cryptographic Audit Trail
 * Demonstrates tamper-evident hash-chained logging (blockchain-inspired immutability)
 */

import { CryptoEngine } from './crypto.js';

export class AuditLogSystem {
  constructor(initialLogs = []) {
    this.logs = initialLogs;
    this.genesisHash = '0000000000000000000000000000000000000000000000000000000000000000';
  }

  // Get current state of logs
  getLogs() {
    return [...this.logs];
  }

  // Add a new security/banking event with cryptographic chain link
  async logEvent(eventType, description, severity = 'INFO', metadata = {}) {
    const previousLog = this.logs.length > 0 ? this.logs[this.logs.length - 1] : null;
    const previousHash = previousLog ? previousLog.hash : this.genesisHash;
    const timestamp = new Date().toISOString();
    const id = CryptoEngine.generateSecureId('LOG');

    const logEntry = {
      id,
      timestamp,
      eventType,
      description,
      severity, // 'INFO', 'WARN', 'CRITICAL', 'SECURITY_ALERT'
      previousHash,
      metadata
    };

    // Calculate cryptographic hash of this entry combined with previousHash
    const contentToHash = `${id}|${timestamp}|${eventType}|${description}|${severity}|${previousHash}|${JSON.stringify(metadata)}`;
    logEntry.hash = await CryptoEngine.sha256(contentToHash);

    this.logs.unshift(logEntry); // new items on top for UI, but keep chain references
    // Cap at 100 entries
    if (this.logs.length > 100) {
      this.logs.pop();
    }

    return logEntry;
  }

  // Verify the cryptographic integrity of the entire audit chain
  async verifyChainIntegrity() {
    if (this.logs.length === 0) return { intact: true, brokenIndex: -1 };

    // Since we store latest-first, reverse to verify chronologically
    const chronological = [...this.logs].reverse();

    for (let i = 0; i < chronological.length; i++) {
      const entry = chronological[i];
      const expectedPrevHash = i === 0 ? this.genesisHash : chronological[i - 1].hash;

      if (entry.previousHash !== expectedPrevHash) {
        return {
          intact: false,
          brokenIndex: i,
          reason: `Previous hash mismatch at log ${entry.id}. Expected ${expectedPrevHash.substring(0, 10)}..., found ${entry.previousHash.substring(0, 10)}...`
        };
      }

      // Recompute hash
      const contentToHash = `${entry.id}|${entry.timestamp}|${entry.eventType}|${entry.description}|${entry.severity}|${entry.previousHash}|${JSON.stringify(entry.metadata)}`;
      const recomputed = await CryptoEngine.sha256(contentToHash);

      if (recomputed !== entry.hash) {
        return {
          intact: false,
          brokenIndex: i,
          reason: `Data tampering detected at log ${entry.id}. Recomputed hash does not match stored hash.`
        };
      }
    }

    return { intact: true, brokenIndex: -1, verifiedCount: chronological.length };
  }
}
