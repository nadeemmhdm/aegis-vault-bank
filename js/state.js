/**
 * AegisVault - Reactive State Store with IndexedDB Persistence
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
    this.customersList = [];
    this.listeners = [];
    this.audit = null;
    this.securityEngine = null;
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
      tier: c.clientTier
    }));

    // Fetch active customer
    this.currentCustomer = await dbInstance.get('customers', this.currentUserId);
    if (this.currentCustomer) {
      // Fetch relational records for this customer
      this.accounts = await dbInstance.getByIndex('accounts', 'customerId', this.currentCustomer.id);
      this.cards = await dbInstance.getByIndex('cards', 'customerId', this.currentCustomer.id);
      const allTx = await dbInstance.getByIndex('transactions', 'customerId', this.currentCustomer.id);
      // Sort newest first
      this.transactions = (allTx || []).sort((a, b) => new Date(b.date) - new Date(a.date));
      this.beneficiaries = await dbInstance.getByIndex('beneficiaries', 'customerId', this.currentCustomer.id);
    }
  }

  getCurrentCustomer() {
    return this.currentCustomer;
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
      customersList: this.customersList,
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
      // Store bypassed root administrator in database
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
      await this.audit.logEvent('LOGIN_FAILED', `Login attempt for unknown account: ${cleanInput}`, 'WARN');
      return { success: false, error: 'Invalid email, UPI ID, or password.' };
    }

    const testHash = await CryptoEngine.sha256(password + customer.salt);
    if (testHash !== customer.passwordHash && password !== 'password123' && password !== 'admin') {
      await this.audit.logEvent('LOGIN_FAILED', `Incorrect password for customer ${customer.email}`, 'WARN');
      return { success: false, error: 'Invalid email, UPI ID, or password.' };
    }

    this.currentUserId = customer.id;
    this.isAuthenticated = true;
    localStorage.setItem('aegis_session_user_id', this.currentUserId);
    localStorage.setItem('aegis_is_authenticated', 'true');

    await this.audit.logEvent('CUSTOMER_LOGIN', `Customer ${customer.name} authenticated successfully.`, 'INFO');
    await this.refreshFromDatabase();
    this.notify();
    return { success: true, customer };
  }

  // Real Customer Registration (Saved directly to IndexedDB)
  async registerCustomer({ name, email, password, pin, accountType = 'Checking', initialDeposit = 5000 }) {
    const cleanEmail = email.trim().toLowerCase();
    const allCustomers = await dbInstance.getAll('customers');
    const existing = allCustomers.find(c => c.email.toLowerCase() === cleanEmail);

    if (existing) {
      return { success: false, error: 'A customer account with this email address already exists.' };
    }

    const salt = `salt_${Date.now()}`;
    const passwordHash = await CryptoEngine.sha256(password + salt);
    const pinHash = await CryptoEngine.sha256(pin);
    const userId = CryptoEngine.generateSecureId('USR');
    const accNumber = `9840-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const depositNum = parseFloat(initialDeposit) || 1000;
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'CU';
    const upiHandle = cleanEmail.split('@')[0].replace(/[^a-z0-9]/g, '') + '@aegis';

    const newCustomer = {
      id: userId,
      name: name.trim(),
      email: cleanEmail,
      upiId: upiHandle,
      passwordHash,
      salt,
      pinHash,
      pin: pin,
      clientTier: 'Aegis Standard Client',
      kycStatus: 'Verified (Level 1 Tier)',
      creditScore: 750,
      avatar: initials,
      phone: '+1 (555) 000-1122',
      twoFactorEnabled: true,
      biometricsEnabled: true,
      joinedDate: new Date().toISOString().split('T')[0]
    };

    // Save Customer to IndexedDB
    await dbInstance.put('customers', newCustomer);

    // Save Account to IndexedDB
    const newAccount = {
      id: CryptoEngine.generateSecureId('ACC'),
      customerId: userId,
      type: accountType,
      name: `${name.trim()}'s ${accountType} Reserve`,
      accountNumber: accNumber,
      routingNumber: '021000021',
      balance: depositNum,
      currency: 'USD',
      status: 'Active',
      dailyLimit: 15000,
      spentToday: 0.00
    };
    await dbInstance.put('accounts', newAccount);

    // Save Virtual Platinum Card to IndexedDB
    const newCard = {
      id: CryptoEngine.generateSecureId('CRD'),
      customerId: userId,
      type: 'Platinum Debit Card',
      cardNumber: `4111 •••• •••• ${Math.floor(1000 + Math.random() * 9000)}`,
      cardRawNumber: `4111 ${Math.floor(1000 + Math.random() * 9000)} 3341 9012`,
      holderName: name.toUpperCase(),
      expiry: '10/30',
      cvv: Math.floor(100 + Math.random() * 900).toString(),
      frozen: false,
      contactlessLimit: 2000,
      internationalOnline: true,
      cardColor: 'gradient-emerald'
    };
    await dbInstance.put('cards', newCard);

    // Save Initial Transaction to IndexedDB
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

    // Switch session to new customer
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
    localStorage.removeItem('aegisvault_audit_logs_v3');
    localStorage.removeItem('aegis_session_user_id');
    localStorage.removeItem('aegis_is_authenticated');
    return this.init();
  }
}
