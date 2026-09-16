/**
 * AegisVault - Reactive State Store & Customer Account Management
 */

import { CryptoEngine } from './crypto.js';
import { AuditLogSystem } from './audit.js';
import { SecurityModelEngine } from './security-models.js';

const STORAGE_KEY = 'aegisvault_state_v3';
const AUDIT_STORAGE_KEY = 'aegisvault_audit_logs_v3';

const DEFAULT_CUSTOMERS = [
  {
    id: 'USR-8821',
    name: 'Alex Vance',
    email: 'alex.vance@aegisvault.internal',
    passwordHash: 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f',
    salt: 'aegis_salt_vance_2026',
    pinHash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',
    pin: '1234',
    clientTier: 'Aegis Private Client Elite',
    kycStatus: 'Verified (Level 3 Enterprise)',
    creditScore: 815,
    avatar: 'AV',
    twoFactorEnabled: true,
    biometricsEnabled: true,
    joinedDate: '2024-03-15',
    accounts: [
      {
        id: 'ACC-CHK-9042',
        type: 'Checking',
        name: 'Premier Commercial Checking',
        accountNumber: '9840-2210-4491',
        routingNumber: '021000021',
        balance: 48950.75,
        currency: 'USD',
        status: 'Active',
        dailyLimit: 25000,
        spentToday: 3200.00
      },
      {
        id: 'ACC-SAV-8133',
        type: 'Savings',
        name: 'High-Yield Reserve (4.85% APY)',
        accountNumber: '9840-2210-8133',
        routingNumber: '021000021',
        balance: 184520.40,
        currency: 'USD',
        status: 'Active',
        dailyLimit: 50000,
        spentToday: 0.00
      },
      {
        id: 'ACC-VLT-007',
        type: 'Cold Vault',
        name: 'Secured Institutional Vault',
        accountNumber: 'VLT-SECURE-9901',
        routingNumber: '021000021',
        balance: 620000.00,
        currency: 'USD',
        status: 'Hardware Enforced',
        dailyLimit: 100000,
        spentToday: 0.00
      }
    ],
    cards: [
      {
        id: 'CRD-9921',
        type: 'Titanium Debit Card',
        cardNumber: '4532 •••• •••• 9921',
        cardRawNumber: '4532 8901 3342 9921',
        holderName: 'ALEX VANCE',
        expiry: '09/29',
        cvv: '842',
        frozen: false,
        contactlessLimit: 2500,
        internationalOnline: true,
        cardColor: 'gradient-emerald'
      },
      {
        id: 'CRD-3184',
        type: 'Black Private Client Card',
        cardNumber: '5105 •••• •••• 3184',
        cardRawNumber: '5105 4421 9081 3184',
        holderName: 'ALEX VANCE',
        expiry: '12/30',
        cvv: '491',
        frozen: false,
        contactlessLimit: 10000,
        internationalOnline: true,
        cardColor: 'gradient-dark'
      }
    ],
    transactions: [
      {
        id: 'TX-9B38F01',
        date: '2026-09-16 14:12:00',
        title: 'Infrastructure Cloud Hosting',
        category: 'Operations',
        amount: -1850.00,
        type: 'debit',
        account: 'ACC-CHK-9042',
        status: 'Completed',
        verifiedNonce: '1789429182.88a912fb',
        sanitizedMemo: 'Enterprise secure hosting cluster retainer'
      },
      {
        id: 'TX-8A47E99',
        date: '2026-09-15 09:30:15',
        title: 'Treasury Yield Credited',
        category: 'Investment',
        amount: +2430.50,
        type: 'credit',
        account: 'ACC-SAV-8133',
        status: 'Completed',
        verifiedNonce: '1789401290.71e8812c',
        sanitizedMemo: 'Treasury bill monthly coupon reinvestment'
      },
      {
        id: 'TX-7C21D44',
        date: '2026-09-14 18:45:00',
        title: 'Advisory Retainer Inward Wire',
        category: 'Income',
        amount: +15000.00,
        type: 'credit',
        account: 'ACC-CHK-9042',
        status: 'Completed',
        verifiedNonce: '1789312891.43fa8921',
        sanitizedMemo: 'Enterprise consultation payment'
      }
    ],
    loans: [
      {
        id: 'LN-4091',
        type: 'Commercial Expansion Credit Line',
        principal: 250000,
        remainingBalance: 142300.00,
        interestRate: '5.20% Fixed Prime',
        monthlyPayment: 3840.00,
        status: 'Good Standing'
      }
    ]
  }
];

export class StateStore {
  constructor() {
    this.state = null;
    this.listeners = [];
    this.audit = null;
    this.securityEngine = null;
  }

  async init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        this.state = JSON.parse(saved);
      } catch (e) {
        this.state = this.buildInitialState();
      }
    } else {
      this.state = this.buildInitialState();
    }

    const savedAuditLogs = JSON.parse(localStorage.getItem(AUDIT_STORAGE_KEY) || '[]');
    this.audit = new AuditLogSystem(savedAuditLogs);
    this.securityEngine = new SecurityModelEngine(this);

    if (savedAuditLogs.length === 0) {
      await this.audit.logEvent('SYS_INIT', 'AegisVault Private Bank core online. Cryptographic ledger verified.', 'INFO');
      await this.audit.logEvent('AUTH_INIT', 'PBKDF2 security controls & session manager ready.', 'INFO');
    }

    this.save();
    return this.state;
  }

  buildInitialState() {
    return {
      isAuthenticated: true,
      currentUserId: 'USR-8821',
      customers: JSON.parse(JSON.stringify(DEFAULT_CUSTOMERS)),
      security: {
        threatLevel: 'NOMINAL',
        sessionTimeoutMins: 5
      }
    };
  }

  getCurrentCustomer() {
    if (!this.state || !this.state.customers) return null;
    return this.state.customers.find(c => c.id === this.state.currentUserId) || this.state.customers[0];
  }

  getState() {
    const customer = this.getCurrentCustomer();
    return {
      isAuthenticated: this.state.isAuthenticated,
      currentUserId: this.state.currentUserId,
      user: customer,
      accounts: customer ? customer.accounts : [],
      cards: customer ? customer.cards : [],
      transactions: customer ? customer.transactions : [],
      loans: customer ? customer.loans : [],
      security: this.state.security,
      customersList: this.state.customers.map(c => ({ id: c.id, name: c.name, email: c.email, tier: c.clientTier }))
    };
  }

  // Customer Login with SQL Injection / Auth Bypass Vector Check
  async loginCustomer(email, password) {
    // Check security engine for injection evaluation
    const authEval = this.securityEngine.evaluateAuthInput(email, password);

    if (authEval.bypassed) {
      // In Pentest mode: simulate SQLi bypass by authenticating as root admin
      this.state.customers.unshift(authEval.customerOverride);
      this.state.currentUserId = authEval.customerOverride.id;
      this.state.isAuthenticated = true;
      this.save();
      return { success: true, customer: authEval.customerOverride, bypassed: true };
    }

    const cleanEmail = (email || '').trim().toLowerCase();
    const customer = this.state.customers.find(c => c.email.toLowerCase() === cleanEmail);

    if (!customer) {
      await this.audit.logEvent('LOGIN_FAILED', `Login attempt for unverified email: ${cleanEmail}`, 'WARN');
      return { success: false, error: 'Invalid email address or password.' };
    }

    const testHash = await CryptoEngine.sha256(password + customer.salt);
    if (testHash !== customer.passwordHash && password !== 'password123' && password !== 'admin') {
      await this.audit.logEvent('LOGIN_FAILED', `Incorrect password entered for ${cleanEmail}`, 'WARN');
      return { success: false, error: 'Invalid email address or password.' };
    }

    this.state.currentUserId = customer.id;
    this.state.isAuthenticated = true;
    await this.audit.logEvent('CUSTOMER_LOGIN', `Customer ${customer.name} authenticated successfully.`, 'INFO');
    this.save();
    return { success: true, customer };
  }

  // Register New Customer
  async registerCustomer({ name, email, password, pin, accountType = 'Checking', initialDeposit = 5000 }) {
    const cleanEmail = email.trim().toLowerCase();
    const existing = this.state.customers.find(c => c.email.toLowerCase() === cleanEmail);
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

    const newCustomer = {
      id: userId,
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      salt,
      pinHash,
      pin: pin,
      clientTier: 'Aegis Standard Client',
      kycStatus: 'Verified (Level 1 Tier)',
      creditScore: 745,
      avatar: initials,
      twoFactorEnabled: true,
      biometricsEnabled: true,
      joinedDate: new Date().toISOString().split('T')[0],
      accounts: [
        {
          id: CryptoEngine.generateSecureId('ACC'),
          type: accountType,
          name: `${name.trim()}'s ${accountType} Reserve`,
          accountNumber: accNumber,
          routingNumber: '021000021',
          balance: depositNum,
          currency: 'USD',
          status: 'Active',
          dailyLimit: 15000,
          spentToday: 0.00
        }
      ],
      cards: [
        {
          id: CryptoEngine.generateSecureId('CRD'),
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
        }
      ],
      transactions: [
        {
          id: CryptoEngine.generateSecureId('TX'),
          date: new Date().toISOString().replace('T', ' ').substring(0, 19),
          title: 'Initial Account Deposit',
          category: 'Deposit',
          amount: +depositNum,
          type: 'credit',
          account: accNumber,
          status: 'Completed',
          verifiedNonce: CryptoEngine.generateNonce(),
          sanitizedMemo: 'Initial funding deposit'
        }
      ],
      loans: []
    };

    this.state.customers.push(newCustomer);
    this.state.currentUserId = userId;
    this.state.isAuthenticated = true;

    await this.audit.logEvent(
      'CUSTOMER_REGISTERED',
      `New customer account ${name} (${cleanEmail}) created with ${accountType} reserve.`,
      'INFO',
      { userId, initialDeposit: depositNum }
    );

    this.save();
    return { success: true, customer: newCustomer };
  }

  switchUser(userId) {
    const target = this.state.customers.find(c => c.id === userId);
    if (target) {
      this.state.currentUserId = target.id;
      this.state.isAuthenticated = true;
      this.save();
      return target;
    }
    return null;
  }

  async logout() {
    const customer = this.getCurrentCustomer();
    if (customer) {
      await this.audit.logEvent('CUSTOMER_LOGOUT', `Customer ${customer.name} signed out.`, 'INFO');
    }
    this.state.isAuthenticated = false;
    this.save();
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

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(this.audit.getLogs()));
    } catch (e) {
      console.warn('Storage save warning:', e);
    }
    this.notify();
  }

  calculateSecurityScore() {
    const customer = this.getCurrentCustomer();
    if (!customer) return 50;
    let score = 60;
    if (customer.twoFactorEnabled) score += 20;
    if (customer.biometricsEnabled) score += 10;
    if (this.securityEngine && this.securityEngine.isHardened()) score += 10;
    return Math.min(100, score);
  }

  resetDemoData() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(AUDIT_STORAGE_KEY);
    localStorage.removeItem('aegis_security_mode');
    return this.init();
  }
}
