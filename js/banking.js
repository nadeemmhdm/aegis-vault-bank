/**
 * AegisVault - Banking Operations & Wire Transfer Engine
 */

import { CryptoEngine } from './crypto.js';

export class BankingEngine {
  constructor(stateStore, authManager, securityEngine) {
    this.store = stateStore;
    this.auth = authManager;
    this.secEngine = securityEngine;
  }

  getTotalNetWorth() {
    const customer = this.store.getCurrentCustomer();
    if (!customer || !customer.accounts) return 0;
    return customer.accounts.reduce((sum, acc) => sum + acc.balance, 0);
  }

  // Execute Wire Transfer with realistic parameter and nonce evaluation
  async executeTransfer({
    sourceAccountId,
    recipientName,
    recipientAccount,
    routingNumber,
    amount,
    memo,
    nonce,
    pin,
    totpCode
  }) {
    const customer = this.store.getCurrentCustomer();
    if (!customer) return { success: false, error: 'Customer session not active.' };

    const sourceAcc = customer.accounts.find(a => a.id === sourceAccountId);
    if (!sourceAcc) {
      return { success: false, error: 'Source debit account not found.' };
    }

    // Evaluate transfer parameters via security engine
    const paramCheck = this.secEngine.evaluateTransferParameters(amount, sourceAcc.balance);
    if (!paramCheck.valid) {
      return { success: false, error: paramCheck.error };
    }
    const numAmount = paramCheck.cleanAmount;

    // Daily Limit Check
    if (this.secEngine.isHardened() && (sourceAcc.spentToday + numAmount > sourceAcc.dailyLimit)) {
      return {
        success: false,
        error: `Daily limit exceeded ($${sourceAcc.dailyLimit.toLocaleString()} max).`
      };
    }

    // Anti-Replay Nonce Validation
    const nonceCheck = this.secEngine.evaluateReplayNonce(nonce);
    if (!nonceCheck.valid) {
      return { success: false, error: `Security Check Failed: ${nonceCheck.reason}` };
    }

    // PIN Verification
    const pinCheck = await this.auth.verifyPin(pin);
    if (!pinCheck.success) {
      await this.secEngine.logSecurityEvent(
        'AUTH_FAILURE',
        `Failed PIN entry during wire to ${recipientName}`,
        'WARN'
      );
      return { success: false, error: pinCheck.reason };
    }

    // 2FA Verification
    if (customer.twoFactorEnabled && this.secEngine.isHardened()) {
      const totpCheck = await this.auth.verifyTotp(totpCode);
      if (!totpCheck.success) {
        await this.secEngine.logSecurityEvent('2FA_FAILED', `Invalid 2FA code during wire transfer`, 'WARN');
        return { success: false, error: 'Invalid 2FA Code. Enter the 6-digit rolling code or 777888.' };
      }
    }

    // Input Evaluation (Stored XSS vector testable in pentest mode, sanitized in hardened mode)
    const evaluatedMemo = this.secEngine.evaluateTextInput(memo);
    const evaluatedRecipient = this.secEngine.evaluateTextInput(recipientName);

    // Balance update
    sourceAcc.balance -= numAmount;
    sourceAcc.spentToday += numAmount;

    // Record Transaction
    const txId = CryptoEngine.generateSecureId('TX');
    const newTx = {
      id: txId,
      date: new Date().toISOString().replace('T', ' ').substring(0, 19),
      title: `Wire to ${evaluatedRecipient}`,
      category: 'Transfer',
      amount: -numAmount,
      type: 'debit',
      account: sourceAccountId,
      status: 'Completed',
      verifiedNonce: nonce,
      sanitizedMemo: evaluatedMemo,
      recipientAccount: recipientAccount
    };

    customer.transactions.unshift(newTx);

    await this.secEngine.logSecurityEvent(
      'TRANSFER_COMPLETED',
      `Wire transfer of $${numAmount.toFixed(2)} to ${recipientName} completed.`,
      'INFO',
      { txId, nonce, amount: numAmount }
    );

    this.store.save();
    return { success: true, transaction: newTx };
  }

  // Toggle card freeze
  async toggleCardFreeze(cardId) {
    const customer = this.store.getCurrentCustomer();
    if (!customer) return false;
    const card = customer.cards.find(c => c.id === cardId);
    if (!card) return false;

    card.frozen = !card.frozen;
    await this.secEngine.logSecurityEvent(
      'CARD_STATUS_CHANGE',
      `Card ${card.cardNumber} status changed to ${card.frozen ? 'FROZEN' : 'ACTIVE'}`,
      card.frozen ? 'WARN' : 'INFO'
    );
    this.store.save();
    return card.frozen;
  }

  // Regenerate dynamic CVV
  async regenerateCard(cardId) {
    const customer = this.store.getCurrentCustomer();
    if (!customer) return null;
    const card = customer.cards.find(c => c.id === cardId);
    if (!card) return null;

    card.cvv = Math.floor(100 + Math.random() * 900).toString();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
    card.cardNumber = card.cardNumber.replace(/\d{4}$/, randomSuffix);

    await this.secEngine.logSecurityEvent(
      'CARD_TOKEN_REGENERATED',
      `Regenerated CVV and dynamic token for card ${card.cardNumber}`,
      'INFO'
    );
    this.store.save();
    return card;
  }

  // Apply for Credit Line / Loan
  async applyForCreditLine(amount, purpose) {
    const customer = this.store.getCurrentCustomer();
    if (!customer) return { success: false, error: 'Session not active' };

    const requestedAmount = parseFloat(amount);
    if (isNaN(requestedAmount) || requestedAmount <= 0) {
      return { success: false, error: 'Enter a valid loan amount.' };
    }

    const loanId = CryptoEngine.generateSecureId('LN');
    const monthly = (requestedAmount * 0.052 / 12) + (requestedAmount / 60);

    const newLoan = {
      id: loanId,
      type: `${purpose} Facility`,
      principal: requestedAmount,
      remainingBalance: requestedAmount,
      interestRate: '5.20% Fixed Prime',
      monthlyPayment: parseFloat(monthly.toFixed(2)),
      status: 'Approved & Funded'
    };

    if (!customer.loans) customer.loans = [];
    customer.loans.unshift(newLoan);

    if (customer.accounts && customer.accounts[0]) {
      customer.accounts[0].balance += requestedAmount;
    }

    await this.secEngine.logSecurityEvent(
      'CREDIT_LINE_APPROVED',
      `Credit line of $${requestedAmount.toLocaleString()} funded to checking account.`,
      'INFO',
      { loanId, principal: requestedAmount }
    );

    this.store.save();
    return { success: true, loan: newLoan };
  }

  // Export transaction ledger to CSV
  exportLedgerAsCSV() {
    const customer = this.store.getCurrentCustomer();
    if (!customer || !customer.transactions) return;

    const headers = ['Transaction ID', 'Date/Time', 'Title', 'Category', 'Amount (USD)', 'Status', 'Verified Nonce'];
    const rows = customer.transactions.map(tx => [
      tx.id,
      `"${tx.date}"`,
      `"${tx.title}"`,
      tx.category,
      tx.amount.toFixed(2),
      tx.status,
      tx.verifiedNonce || 'N/A'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `AegisVault_Statement_${customer.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
