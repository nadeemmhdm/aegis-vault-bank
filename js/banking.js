/**
 * AegisVault - Banking, UPI Payments & Real Database Transactions Engine
 */

import { CryptoEngine } from './crypto.js';
import { dbInstance } from './db.js';

export class BankingEngine {
  constructor(stateStore, authManager, securityEngine) {
    this.store = stateStore;
    this.auth = authManager;
    this.secEngine = securityEngine;
  }

  getTotalNetWorth() {
    const customer = this.store.getCurrentCustomer();
    if (!customer || !this.store.accounts) return 0;
    return this.store.accounts.reduce((sum, acc) => sum + acc.balance, 0);
  }

  // Execute Wire Transfer (Persisted in IndexedDB)
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

    const sourceAcc = this.store.accounts.find(a => a.id === sourceAccountId);
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
      await this.secEngine.logSecurityEvent('AUTH_FAILURE', `Failed PIN during wire to ${recipientName}`, 'WARN');
      return { success: false, error: pinCheck.reason };
    }

    // 2FA Verification
    if (customer.twoFactorEnabled && this.secEngine.isHardened()) {
      const totpCheck = await this.auth.verifyTotp(totpCode);
      if (!totpCheck.success) {
        await this.secEngine.logSecurityEvent('2FA_FAILED', `Invalid 2FA code during wire transfer`, 'WARN');
        return { success: false, error: 'Invalid 2FA Code. Enter rolling code or 777888.' };
      }
    }

    // Text Sanitization / Evaluation
    const evaluatedMemo = this.secEngine.evaluateTextInput(memo);
    const evaluatedRecipient = this.secEngine.evaluateTextInput(recipientName);

    // Update account balance in IndexedDB
    sourceAcc.balance -= numAmount;
    sourceAcc.spentToday += numAmount;
    await dbInstance.put('accounts', sourceAcc);

    // Insert Transaction Record into IndexedDB
    const txId = CryptoEngine.generateSecureId('TX-WIRE');
    const newTx = {
      id: txId,
      customerId: customer.id,
      date: new Date().toISOString().replace('T', ' ').substring(0, 19),
      title: `Wire to ${evaluatedRecipient}`,
      category: 'Wire Transfer',
      paymentMethod: 'WIRE',
      amount: -numAmount,
      type: 'debit',
      account: sourceAccountId,
      status: 'Completed',
      verifiedNonce: nonce,
      memo: evaluatedMemo,
      recipientAccount: recipientAccount
    };
    await dbInstance.put('transactions', newTx);

    await this.secEngine.logSecurityEvent(
      'TRANSFER_COMPLETED',
      `Wire of $${numAmount.toFixed(2)} to ${recipientName} (${recipientAccount}) executed and committed to IndexedDB.`,
      'INFO',
      { txId, nonce, amount: numAmount }
    );

    await this.store.refreshFromDatabase();
    this.store.notify();
    return { success: true, transaction: newTx };
  }

  // Execute Instant UPI Payment (Persisted in IndexedDB)
  async executeUpiPayment({
    sourceAccountId,
    targetUpiId,
    amount,
    note,
    pin
  }) {
    const customer = this.store.getCurrentCustomer();
    if (!customer) return { success: false, error: 'Session not active.' };

    const cleanUpi = (targetUpiId || '').trim().toLowerCase();
    if (!cleanUpi.includes('@')) {
      return { success: false, error: 'Invalid UPI VPA format. Must be in format user@bank or merchant@upi.' };
    }

    const sourceAcc = this.store.accounts.find(a => a.id === sourceAccountId) || this.store.accounts[0];
    if (!sourceAcc) {
      return { success: false, error: 'Linked debit account not found.' };
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return { success: false, error: 'Please enter a valid positive UPI payment amount.' };
    }

    if (sourceAcc.balance < numAmount && this.secEngine.isHardened()) {
      return { success: false, error: `Insufficient account balance. Available: $${sourceAcc.balance.toFixed(2)}` };
    }

    // Verify PIN
    const pinCheck = await this.auth.verifyPin(pin);
    if (!pinCheck.success) {
      return { success: false, error: pinCheck.reason };
    }

    // Deduct and save account in IndexedDB
    sourceAcc.balance -= numAmount;
    await dbInstance.put('accounts', sourceAcc);

    // Generate UPI Reference Number (12-digit standard)
    const upiRef = `UPI${Math.floor(100000000000 + Math.random() * 900000000000)}`;
    const txId = CryptoEngine.generateSecureId('TX-UPI');

    const newTx = {
      id: txId,
      customerId: customer.id,
      date: new Date().toISOString().replace('T', ' ').substring(0, 19),
      title: `UPI to ${cleanUpi}`,
      category: 'UPI Instant',
      paymentMethod: 'UPI',
      amount: -numAmount,
      type: 'debit',
      account: sourceAcc.id,
      status: 'Completed',
      upiRef,
      verifiedNonce: CryptoEngine.generateNonce(),
      memo: this.secEngine.evaluateTextInput(note) || 'UPI Instant Transfer'
    };
    await dbInstance.put('transactions', newTx);

    // If recipient is another customer in our bank database, credit them!
    const allCustomers = await dbInstance.getAll('customers');
    const recipientCustomer = allCustomers.find(c => c.upiId && c.upiId.toLowerCase() === cleanUpi);
    if (recipientCustomer) {
      const recipientAccs = await dbInstance.getByIndex('accounts', 'customerId', recipientCustomer.id);
      if (recipientAccs && recipientAccs[0]) {
        recipientAccs[0].balance += numAmount;
        await dbInstance.put('accounts', recipientAccs[0]);

        const creditTx = {
          id: CryptoEngine.generateSecureId('TX-UPI'),
          customerId: recipientCustomer.id,
          date: new Date().toISOString().replace('T', ' ').substring(0, 19),
          title: `UPI from ${customer.upiId || customer.email}`,
          category: 'UPI Instant',
          paymentMethod: 'UPI',
          amount: +numAmount,
          type: 'credit',
          account: recipientAccs[0].id,
          status: 'Completed',
          upiRef,
          verifiedNonce: CryptoEngine.generateNonce(),
          memo: `Received from ${customer.name}`
        };
        await dbInstance.put('transactions', creditTx);
      }
    }

    await this.secEngine.logSecurityEvent(
      'UPI_PAYMENT_COMPLETED',
      `UPI payment of $${numAmount.toFixed(2)} to ${cleanUpi} (Ref: ${upiRef}) completed.`,
      'INFO',
      { txId, upiRef, amount: numAmount }
    );

    await this.store.refreshFromDatabase();
    this.store.notify();
    return { success: true, transaction: newTx, upiRef };
  }

  // Pay Utility Bill
  async payUtilityBill(billerCategory, billerName, consumerNumber, amount, pin) {
    const customer = this.store.getCurrentCustomer();
    if (!customer) return { success: false, error: 'Session not active.' };

    const sourceAcc = this.store.accounts[0];
    if (!sourceAcc) return { success: false, error: 'No debit account found.' };

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return { success: false, error: 'Invalid bill amount.' };

    if (sourceAcc.balance < numAmount && this.secEngine.isHardened()) {
      return { success: false, error: 'Insufficient funds for bill settlement.' };
    }

    const pinCheck = await this.auth.verifyPin(pin);
    if (!pinCheck.success) return { success: false, error: pinCheck.reason };

    sourceAcc.balance -= numAmount;
    await dbInstance.put('accounts', sourceAcc);

    const txId = CryptoEngine.generateSecureId('TX-BILL');
    const newTx = {
      id: txId,
      customerId: customer.id,
      date: new Date().toISOString().replace('T', ' ').substring(0, 19),
      title: `${billerName} Bill Payment`,
      category: 'Utility Bill',
      paymentMethod: 'BILL_PAY',
      amount: -numAmount,
      type: 'debit',
      account: sourceAcc.id,
      status: 'Completed',
      verifiedNonce: CryptoEngine.generateNonce(),
      memo: `Acc: ${consumerNumber} (${billerCategory})`
    };
    await dbInstance.put('transactions', newTx);

    await this.secEngine.logSecurityEvent(
      'BILL_PAYMENT_COMPLETED',
      `Utility bill of $${numAmount.toFixed(2)} paid to ${billerName} (${consumerNumber}).`,
      'INFO',
      { txId, billerName }
    );

    await this.store.refreshFromDatabase();
    this.store.notify();
    return { success: true, transaction: newTx };
  }

  // Toggle card freeze in IndexedDB
  async toggleCardFreeze(cardId) {
    const card = await dbInstance.get('cards', cardId);
    if (!card) return false;

    card.frozen = !card.frozen;
    await dbInstance.put('cards', card);

    await this.secEngine.logSecurityEvent(
      'CARD_STATUS_CHANGE',
      `Card ${card.cardNumber} status toggled to ${card.frozen ? 'FROZEN' : 'ACTIVE'}`,
      card.frozen ? 'WARN' : 'INFO'
    );

    await this.store.refreshFromDatabase();
    this.store.notify();
    return card.frozen;
  }

  // Regenerate dynamic CVV in IndexedDB
  async regenerateCard(cardId) {
    const card = await dbInstance.get('cards', cardId);
    if (!card) return null;

    card.cvv = Math.floor(100 + Math.random() * 900).toString();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
    card.cardNumber = card.cardNumber.replace(/\d{4}$/, randomSuffix);

    await dbInstance.put('cards', card);

    await this.secEngine.logSecurityEvent(
      'CARD_TOKEN_REGENERATED',
      `Regenerated CVV and dynamic token for card ${card.cardNumber}`,
      'INFO'
    );

    await this.store.refreshFromDatabase();
    this.store.notify();
    return card;
  }

  // Apply for Credit Line / Loan in IndexedDB
  async applyForCreditLine(amount, purpose) {
    const customer = this.store.getCurrentCustomer();
    if (!customer) return { success: false, error: 'Session not active' };

    const requestedAmount = parseFloat(amount);
    if (isNaN(requestedAmount) || requestedAmount <= 0) {
      return { success: false, error: 'Enter a valid loan amount.' };
    }

    const sourceAcc = this.store.accounts[0];
    if (sourceAcc) {
      sourceAcc.balance += requestedAmount;
      await dbInstance.put('accounts', sourceAcc);
    }

    const loanId = CryptoEngine.generateSecureId('LN');
    const newTx = {
      id: loanId,
      customerId: customer.id,
      date: new Date().toISOString().replace('T', ' ').substring(0, 19),
      title: `${purpose} Facility Disbursed`,
      category: 'Credit Facility',
      paymentMethod: 'CREDIT_LINE',
      amount: +requestedAmount,
      type: 'credit',
      account: sourceAcc ? sourceAcc.id : 'N/A',
      status: 'Completed',
      verifiedNonce: CryptoEngine.generateNonce(),
      memo: `Instant credit line funding at 5.20% APR`
    };
    await dbInstance.put('transactions', newTx);

    await this.secEngine.logSecurityEvent(
      'CREDIT_LINE_APPROVED',
      `Credit line of $${requestedAmount.toLocaleString()} funded to checking account in IndexedDB.`,
      'INFO',
      { loanId, principal: requestedAmount }
    );

    await this.store.refreshFromDatabase();
    this.store.notify();
    return { success: true, loanId };
  }

  // Export transaction ledger to CSV
  exportLedgerAsCSV() {
    const customer = this.store.getCurrentCustomer();
    if (!customer || !this.store.transactions) return;

    const headers = ['Transaction ID', 'Date/Time', 'Title', 'Method', 'Category', 'Amount (USD)', 'Status', 'Verified Nonce'];
    const rows = this.store.transactions.map(tx => [
      tx.id,
      `"${tx.date}"`,
      `"${tx.title}"`,
      tx.paymentMethod || 'STANDARD',
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
