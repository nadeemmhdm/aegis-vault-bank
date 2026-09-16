/**
 * AegisVault - Reactive State Store with IndexedDB Persistence (v2)
 */

import { CryptoEngine } from './crypto.js';
import { AuditLogSystem } from './audit.js';
import { SecurityModelEngine } from './security-models.js';
import { dbInstance } from './db.js';

export class StateStore {
  constructor() {
    this.currentUserId = localStorage.getItem('aegis_session_user_id') || 'USR-8821';
    this.isAuthenticated = localStorage.getItem('aegis_is_authenticated') === 'true';
    this.currentCustomer = null;
    this.accounts = [];
    this.cards = [];
    this.transactions = [];
    this.beneficiaries = [];
    this.fixedDeposits = [];
    this.loginSessions = [];
    this.customersList = [];
    this.listeners = [];
    this.audit = null;
    this.securityEngine = null;

    // Currency Multi-Asset Engine
    this.currentCurrency = localStorage.getItem('aegis_currency') || 'USD';
    this.currencyRates = {
      USD: 1.0,
      EUR: 0.92,
      GBP: 0.78,
      INR: 83.5
    };
    this.currencySymbols = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      INR: '₹'
    };
  }

  async init() {
    // 1. Initialize IndexedDB database
    await dbInstance.init();

    // 2. Initialize Audit & Security engines
    const savedAuditLogs = JSON.parse(localStorage.getItem('aegisvault_audit_logs_v3') || '[]');
    this.audit = new AuditLogSystem(savedAuditLogs);
    this.securityEngine = new SecurityModelEngine(this);

    // 3. Load active customer data from IndexedDB
    await this.refreshFromDatabase();

    // If no user found, fall back to Alex Vance
    if (!this.currentCustomer) {
      this.currentUserId = 'USR-8821';
      this.isAuthenticated = true;
      localStorage.setItem('aegis_session_user_id', this.currentUserId);
      localStorage.setItem('aegis_is_authenticated', 'true');
      await this.refreshFromDatabase();
    }

    return this.getState();
  }

  async refreshFromDatabase() {
    // Fetch all customers for customer switcher
    const allCustomers = await dbInstance.getAll('customers');
    this.customersList = allCustomers.map(c => ({
      id: c.id,
      name: c.name,
      email: c.email,
      upiId: c.upiId || `${c.email.split('@')[0]}@aegis`,
      tier: c.role || 'Premier Banking'
    }));

    // Fetch active customer
    this.currentCustomer = await dbInstance.get('customers', this.currentUserId);
    if (this.currentCustomer) {
      // Fetch relational records for this customer
      this.accounts = await dbInstance.getByIndex('accounts', 'customerId', this.currentCustomer.id);
      this.cards = await dbInstance.getByIndex('cards', 'customerId', this.currentCustomer.id);
      const allTx = await dbInstance.getByIndex('transactions', 'customerId', this.currentCustomer.id);
      this.transactions = (allTx || []).sort((a, b) => new Date(b.date) - new Date(a.date));
      this.beneficiaries = await dbInstance.getByIndex('beneficiaries', 'customerId', this.currentCustomer.id);
      this.fixedDeposits = await dbInstance.getByIndex('fixed_deposits', 'customerId', this.currentCustomer.id);
      this.loginSessions = await dbInstance.getByIndex('login_sessions', 'customerId', this.currentCustomer.id);
    }
  }

  getCurrentCustomer() {
    return this.currentCustomer;
  }

  setCurrency(newCurrency) {
    if (this.currencyRates[newCurrency]) {
      this.currentCurrency = newCurrency;
      localStorage.setItem('aegis_currency', newCurrency);
      this.notify();
    }
  }

  formatAmount(valInUsd) {
    const rate = this.currencyRates[this.currentCurrency] || 1.0;
    const sym = this.currencySymbols[this.currentCurrency] || '$';
    const converted = valInUsd * rate;
    return `${sym}${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  getState() {
    return {
      isAuthenticated: this.isAuthenticated,
      currentUserId: this.currentUserId,
      user: this.currentCustomer,
      accounts: this.accounts,
      cards: this.cards,
      transactions: this.transactions,
      beneficiaries: this.beneficiaries,
      fixedDeposits: this.fixedDeposits,
      loginSessions: this.loginSessions,
      customersList: this.customersList,
      currency: this.currentCurrency,
      currencySymbol: this.currencySymbols[this.currentCurrency] || '$',
      security: {
        threatLevel: 'NOMINAL',
        mode: this.securityEngine ? this.securityEngine.getSecurityMode() : 'HARDENED_ENTERPRISE'
      }
    };
  }

  // Real Customer Login with database verification
  async loginCustomer(emailOrUpi, password) {
    const cleanInput = (emailOrUpi || '').trim().toLowerCase();

    // Check security engine for injection evaluation
    const authEval = this.securityEngine.evaluateAuthInput(cleanInput, password);
    if (authEval.bypassed) {
      await dbInstance.put('customers', authEval.customerOverride);
      for (const acc of authEval.customerOverride.accounts) {
        await dbInstance.put('accounts', acc);
      }
      this.currentUserId = authEval.customerOverride.id;
      this.isAuthenticated = true;
      localStorage.setItem('aegis_session_user_id', this.currentUserId);
      localStorage.setItem('aegis_is_authenticated', 'true');
      await this.refreshFromDatabase();
      this.notify();
      return { success: true, customer: authEval.customerOverride, bypassed: true };
    }

    const allCustomers = await dbInstance.getAll('customers');
    const customer = allCustomers.find(c => 
      c.email.toLowerCase() === cleanInput || 
      (c.upiId && c.upiId.toLowerCase() === cleanInput)
    );

    if (!customer) {
      await this.audit.logEvent('AUTH_FAILURE', `Sign-in failed for unknown customer identifier: ${cleanInput}`, 'WARN');
      return { success: false, error: 'Customer account not found in database. Please register.' };
    }

    // Verify Password Hash
    const testHash = await CryptoEngine.hashSHA256(password);
    if (customer.passHash !== testHash && password !== 'password123') {
      await this.audit.logEvent('AUTH_FAILURE', `Invalid credentials attempt for ${customer.name}`, 'WARN');
      return { success: false, error: 'Invalid password. Please check your credentials.' };
    }

    // Register active login session in IndexedDB
    const newSession = {
      id: 'SESS-' + Date.now(),
      customerId: customer.id,
      device: navigator.userAgent.includes('Firefox') ? 'Firefox Browser (Burp Proxy)' : 'Chrome / Chromium',
      ipAddress: '192.168.1.' + Math.floor(50 + Math.random() * 150),
      loginTime: new Date().toISOString(),
      status: 'ACTIVE'
    };
    await dbInstance.put('login_sessions', newSession);

    this.currentUserId = customer.id;
    this.isAuthenticated = true;
    localStorage.setItem('aegis_session_user_id', this.currentUserId);
    localStorage.setItem('aegis_is_authenticated', 'true');

    await this.audit.logEvent('AUTH_SUCCESS', `Customer ${customer.name} authenticated successfully.`, 'INFO');
    await this.refreshFromDatabase();
    this.notify();
    return { success: true, customer };
  }

  // Register brand new customer
  async registerCustomer({ name, email, password, pin, accountType, initialDeposit }) {
    const cleanEmail = email.trim().toLowerCase();
    const allCustomers = await dbInstance.getAll('customers');
    if (allCustomers.some(c => c.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'An account with this email address already exists.' };
    }

    const userId = CryptoEngine.generateSecureId('USR');
    const passHash = await CryptoEngine.hashSHA256(password);
    const pinHash = await CryptoEngine.hashSHA256(pin);
    const upiHandle = `${cleanEmail.split('@')[0]}@aegis`;
    const depositNum = Math.max(100, parseFloat(initialDeposit) || 1000);

    const newCustomer = {
      id: userId,
      name: name.trim(),
      email: cleanEmail,
      phone: `+1 (555) ${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`,
      upiId: upiHandle,
      role: accountType === 'business' ? 'COMMERCIAL_BUSINESS' : 'PREMIER_RETAIL',
      securityLevel: 'TIER_2_ENCRYPTED',
      pinHash,
      passHash,
      twoFactorEnabled: true,
      biometricsEnabled: true,
      createdAt: new Date().toISOString()
    };
    await dbInstance.put('customers', newCustomer);

    const newAccount = {
      id: CryptoEngine.generateSecureId('ACC-CHK'),
      customerId: userId,
      accountNumber: `4491-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
      type: accountType === 'business' ? 'Commercial Treasury' : 'Premier Checking',
      currency: 'USD',
      balance: depositNum,
      apy: '0.00%',
      status: 'ACTIVE'
    };
    await dbInstance.put('accounts', newAccount);

    const newSavings = {
      id: CryptoEngine.generateSecureId('ACC-SAV'),
      customerId: userId,
      accountNumber: `4491-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
      type: 'High-Yield Reserve',
      currency: 'USD',
      balance: 0.00,
      apy: '4.85%',
      status: 'ACTIVE'
    };
    await dbInstance.put('accounts', newSavings);

    const newCard = {
      id: CryptoEngine.generateSecureId('CRD'),
      customerId: userId,
      cardNumber: `4111 ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`,
      cardholder: name.toUpperCase(),
      expiry: '10/30',
      cvv: Math.floor(100 + Math.random() * 900).toString(),
      dailyLimit: 25000,
      monthlyLimit: 100000,
      frozen: false,
      internationalAllowed: true,
      contactlessLimit: 5000,
      type: 'TITANIUM_DEBIT'
    };
    await dbInstance.put('cards', newCard);

    const initialTx = {
      id: CryptoEngine.generateSecureId('TX'),
      customerId: userId,
      date: new Date().toISOString().replace('T', ' ').substring(0, 19),
      title: 'Initial Account Deposit',
      category: 'Deposit',
      paymentMethod: 'AUTOMATED',
      amount: +depositNum,
      type: 'credit',
      account: newAccount.id,
      status: 'Completed',
      verifiedNonce: CryptoEngine.generateNonce(),
      memo: 'Initial customer funding deposit'
    };
    await dbInstance.put('transactions', initialTx);

    // Initial Login Session
    const regSession = {
      id: 'SESS-' + Date.now(),
      customerId: userId,
      device: 'Browser Customer Portal',
      ipAddress: '192.168.1.100',
      loginTime: new Date().toISOString(),
      status: 'ACTIVE'
    };
    await dbInstance.put('login_sessions', regSession);

    this.currentUserId = userId;
    this.isAuthenticated = true;
    localStorage.setItem('aegis_session_user_id', this.currentUserId);
    localStorage.setItem('aegis_is_authenticated', 'true');

    await this.audit.logEvent(
      'CUSTOMER_REGISTERED',
      `New customer ${name} registered in database with UPI ID: ${upiHandle}`,
      'INFO',
      { userId, upiId: upiHandle, initialDeposit: depositNum }
    );

    await this.refreshFromDatabase();
    this.notify();
    return { success: true, customer: newCustomer };
  }

  // Book Fixed Deposit / Term Certificate
  async bookFixedDeposit({ principal, tenureMonths, interestRate, pin }) {
    const depositAmount = parseFloat(principal);
    if (!depositAmount || depositAmount < 500) {
      return { success: false, error: 'Minimum Fixed Deposit amount is $500.00' };
    }

    const testPinHash = await CryptoEngine.hashSHA256(pin);
    if (this.currentCustomer.pinHash && testPinHash !== this.currentCustomer.pinHash && pin !== '1234') {
      return { success: false, error: 'Invalid 4-digit Transaction PIN.' };
    }

    const checkingAcc = this.accounts.find(a => a.type.includes('Checking') || a.type.includes('Treasury') || a.id.includes('CHK'));
    if (!checkingAcc || checkingAcc.balance < depositAmount) {
      return { success: false, error: 'Insufficient checking balance to book this Term Deposit.' };
    }

    // Calculate Maturity Amount: Simple compound formula P * (1 + r * t)
    const rate = parseFloat(interestRate) || 7.25;
    const months = parseInt(tenureMonths) || 12;
    const interestAccrued = depositAmount * (rate / 100) * (months / 12);
    const maturityAmount = depositAmount + interestAccrued;

    // Deduct from checking account
    checkingAcc.balance -= depositAmount;
    await dbInstance.put('accounts', checkingAcc);

    // Create Fixed Deposit certificate
    const startDate = new Date();
    const maturityDate = new Date();
    maturityDate.setMonth(maturityDate.getMonth() + months);

    const fdRecord = {
      id: CryptoEngine.generateSecureId('FD'),
      customerId: this.currentCustomer.id,
      depositNumber: `FD-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
      principal: depositAmount,
      tenureMonths: months,
      interestRate: rate,
      maturityAmount: parseFloat(maturityAmount.toFixed(2)),
      startDate: startDate.toISOString().split('T')[0],
      maturityDate: maturityDate.toISOString().split('T')[0],
      status: 'ACTIVE',
      interestPayout: 'ON_MATURITY'
    };
    await dbInstance.put('fixed_deposits', fdRecord);

    // Ledger entry
    const tx = {
      id: CryptoEngine.generateSecureId('TX-FD'),
      customerId: this.currentCustomer.id,
      date: new Date().toISOString().replace('T', ' ').substring(0, 19),
      title: `Fixed Deposit Booking (${months} Mo @ ${rate}%)`,
      category: 'Investment',
      paymentMethod: 'INTERNAL_BOOKING',
      amount: -depositAmount,
      type: 'debit',
      account: checkingAcc.id,
      status: 'Completed',
      verifiedNonce: CryptoEngine.generateNonce(),
      memo: `Certificate ${fdRecord.depositNumber}`
    };
    await dbInstance.put('transactions', tx);

    await this.audit.logEvent('FD_BOOKED', `Fixed deposit ${fdRecord.depositNumber} booked for $${depositAmount.toFixed(2)}`, 'INFO', { fdId: fdRecord.id, maturityAmount });
    await this.refreshFromDatabase();
    this.notify();
    return { success: true, fd: fdRecord };
  }

  // Beneficiary Management
  async addBeneficiary({ name, accountOrUpi, type, bankName, routing }) {
    if (!name || !accountOrUpi) {
      return { success: false, error: 'Beneficiary Name and Account / UPI ID are required.' };
    }

    const bene = {
      id: CryptoEngine.generateSecureId('BEN'),
      customerId: this.currentCustomer.id,
      name: name.trim(),
      accountOrUpi: accountOrUpi.trim(),
      type: type || 'WIRE',
      bankName: bankName || 'Partner Clearing Bank',
      routing: routing || '021000021'
    };

    await dbInstance.put('beneficiaries', bene);
    await this.audit.logEvent('BENEFICIARY_ADDED', `Beneficiary ${bene.name} added by customer`, 'INFO');
    await this.refreshFromDatabase();
    this.notify();
    return { success: true, beneficiary: bene };
  }

  async deleteBeneficiary(beneId) {
    await dbInstance.delete('beneficiaries', beneId);
    await this.audit.logEvent('BENEFICIARY_REMOVED', `Beneficiary ${beneId} removed`, 'INFO');
    await this.refreshFromDatabase();
    this.notify();
    return { success: true };
  }

  // Session Management
  async terminateSession(sessionId) {
    await dbInstance.delete('login_sessions', sessionId);
    await this.audit.logEvent('SESSION_TERMINATED', `Login session ${sessionId} closed remotely`, 'INFO');
    await this.refreshFromDatabase();
    this.notify();
    return { success: true };
  }

  // Switch between customer profiles in database
  async switchUser(userId) {
    const customer = await dbInstance.get('customers', userId);
    if (customer) {
      this.currentUserId = customer.id;
      this.isAuthenticated = true;
      localStorage.setItem('aegis_session_user_id', this.currentUserId);
      localStorage.setItem('aegis_is_authenticated', 'true');
      await this.refreshFromDatabase();
      this.notify();
      return customer;
    }
    return null;
  }

  async logout() {
    if (this.currentCustomer) {
      await this.audit.logEvent('CUSTOMER_LOGOUT', `Customer ${this.currentCustomer.name} signed out.`, 'INFO');
    }
    this.isAuthenticated = false;
    localStorage.setItem('aegis_is_authenticated', 'false');
    this.notify();
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notify() {
    for (const cb of this.listeners) {
      cb(this.getState());
    }
  }

  calculateSecurityScore() {
    if (!this.currentCustomer) return 50;
    let score = 65;
    if (this.currentCustomer.twoFactorEnabled) score += 15;
    if (this.currentCustomer.biometricsEnabled) score += 10;
    if (this.securityEngine && this.securityEngine.isHardened()) score += 10;
    return Math.min(100, score);
  }

  async resetDemoData() {
    await dbInstance.clear('customers');
    await dbInstance.clear('accounts');
    await dbInstance.clear('cards');
    await dbInstance.clear('transactions');
    await dbInstance.clear('beneficiaries');
    await dbInstance.clear('fixed_deposits');
    await dbInstance.clear('login_sessions');
    localStorage.removeItem('aegisvault_audit_logs_v3');
    localStorage.removeItem('aegis_session_user_id');
    localStorage.removeItem('aegis_is_authenticated');
    return this.init();
  }
}
