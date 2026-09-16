/**
 * AegisVault - Native IndexedDB Real Persistent Database Engine (v2)
 * Implements an asynchronous client-side relational database for:
 * - Customers
 * - Accounts
 * - Virtual Cards
 * - Transactions & UPI Payments
 * - Fixed Deposits / Term Certificates
 * - Beneficiaries & Payees
 * - Login Sessions & Device Tracking
 * - Audit Trail (Cryptographic SHA-256 Chained Logs)
 */

import { CryptoEngine } from './crypto.js';

const DB_NAME = 'AegisVault_Commercial_DB';
const DB_VERSION = 2;

export class DatabaseEngine {
  constructor() {
    this.db = null;
  }

  // Open & initialize database schema
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;

        // 1. Customers store
        if (!db.objectStoreNames.contains('customers')) {
          const customerStore = db.createObjectStore('customers', { keyPath: 'id' });
          customerStore.createIndex('email', 'email', { unique: true });
          customerStore.createIndex('upiId', 'upiId', { unique: true });
        }

        // 2. Accounts store
        if (!db.objectStoreNames.contains('accounts')) {
          const accountStore = db.createObjectStore('accounts', { keyPath: 'id' });
          accountStore.createIndex('customerId', 'customerId', { unique: false });
          accountStore.createIndex('accountNumber', 'accountNumber', { unique: true });
        }

        // 3. Virtual Cards store
        if (!db.objectStoreNames.contains('cards')) {
          const cardStore = db.createObjectStore('cards', { keyPath: 'id' });
          cardStore.createIndex('customerId', 'customerId', { unique: false });
        }

        // 4. Transactions store
        if (!db.objectStoreNames.contains('transactions')) {
          const txStore = db.createObjectStore('transactions', { keyPath: 'id' });
          txStore.createIndex('customerId', 'customerId', { unique: false });
          txStore.createIndex('date', 'date', { unique: false });
          txStore.createIndex('paymentMethod', 'paymentMethod', { unique: false });
        }

        // 5. Beneficiaries & UPI Contacts store
        if (!db.objectStoreNames.contains('beneficiaries')) {
          const beneStore = db.createObjectStore('beneficiaries', { keyPath: 'id' });
          beneStore.createIndex('customerId', 'customerId', { unique: false });
        }

        // 6. Chained Audit Log store
        if (!db.objectStoreNames.contains('audit_logs')) {
          const auditStore = db.createObjectStore('audit_logs', { keyPath: 'id' });
          auditStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // 7. Fixed Deposits store (v2)
        if (!db.objectStoreNames.contains('fixed_deposits')) {
          const fdStore = db.createObjectStore('fixed_deposits', { keyPath: 'id' });
          fdStore.createIndex('customerId', 'customerId', { unique: false });
          fdStore.createIndex('status', 'status', { unique: false });
        }

        // 8. Active Login Sessions store (v2)
        if (!db.objectStoreNames.contains('login_sessions')) {
          const sessStore = db.createObjectStore('login_sessions', { keyPath: 'id' });
          sessStore.createIndex('customerId', 'customerId', { unique: false });
        }
      };

      request.onsuccess = async (e) => {
        this.db = e.target.result;
        await this.seedInitialDataIfEmpty();
        resolve(this.db);
      };

      request.onerror = (e) => {
        console.error('IndexedDB Initialization error:', e);
        reject(e);
      };
    });
  }

  // Helper to execute transactions
  async tx(storeName, mode, callback) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], mode);
      const store = transaction.objectStore(storeName);
      let request;
      try {
        request = callback(store);
      } catch (err) {
        return reject(err);
      }

      transaction.oncomplete = () => {
        resolve(request ? request.result : true);
      };
      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  }

  // Seed default demo datasets if customer table is empty
  async seedInitialDataIfEmpty() {
    const customerCount = await this.count('customers');
    if (customerCount > 0) return;

    console.info('[IndexedDB] Initializing database with primary commercial accounts...');

    // Master Customer: Alex Vance
    const pinHash = await CryptoEngine.hashSHA256('1234');
    const passHash = await CryptoEngine.hashSHA256('password123');

    const masterCustomer = {
      id: 'USR-8821',
      name: 'Alex Vance',
      email: 'alex.vance@aegisvault.internal',
      phone: '+1 (555) 019-2834',
      upiId: 'alex.vance@aegis',
      role: 'VIP_PRIVATE_CLIENT',
      securityLevel: 'TIER_3_HSM',
      pinHash,
      passHash,
      createdAt: '2026-01-10T08:00:00.000Z'
    };
    await this.put('customers', masterCustomer);

    // Initial Bank Accounts
    const defaultAccounts = [
      {
        id: 'ACC-CHK-9042',
        customerId: 'USR-8821',
        accountNumber: '4491-0812-9042',
        type: 'Premier Checking',
        currency: 'USD',
        balance: 148920.50,
        apy: '0.00%',
        status: 'ACTIVE'
      },
      {
        id: 'ACC-SAV-8133',
        customerId: 'USR-8821',
        accountNumber: '4491-9921-8133',
        type: 'High-Yield Reserve',
        currency: 'USD',
        balance: 624500.00,
        apy: '4.85%',
        status: 'ACTIVE'
      },
      {
        id: 'ACC-VLT-0091',
        customerId: 'USR-8821',
        accountNumber: '4491-7700-0091',
        type: 'Cold Vault Custody',
        currency: 'USD',
        balance: 250000.00,
        apy: '5.25%',
        status: 'LOCKED'
      }
    ];

    for (const acc of defaultAccounts) {
      await this.put('accounts', acc);
    }

    // Virtual Titanium Card
    const defaultCard = {
      id: 'CRD-7701',
      customerId: 'USR-8821',
      cardNumber: '4491 8820 9102 3381',
      cardholder: 'ALEX VANCE',
      expiry: '09/29',
      cvv: '842',
      dailyLimit: 25000,
      monthlyLimit: 100000,
      frozen: false,
      internationalAllowed: true,
      contactlessLimit: 5000,
      type: 'TITANIUM_DEBIT'
    };
    await this.put('cards', defaultCard);

    // Initial Ledger Transactions
    const defaultTxs = [
      {
        id: 'TX-INT-9912',
        customerId: 'USR-8821',
        date: '2026-09-16 16:45:22',
        title: 'High-Yield APY Interest Paid',
        category: 'Interest',
        paymentMethod: 'AUTOMATED',
        amount: +2520.14,
        type: 'credit',
        account: 'ACC-SAV-8133',
        status: 'Completed',
        verifiedNonce: '1789431201.33b190ff',
        memo: 'Monthly compounded savings yield'
      },
      {
        id: 'TX-UPI-7001',
        customerId: 'USR-8821',
        date: '2026-09-16 15:20:10',
        title: 'UPI Instant to devsecops@upi',
        category: 'UPI Transfer',
        paymentMethod: 'UPI',
        amount: -450.00,
        type: 'debit',
        account: 'ACC-CHK-9042',
        status: 'Completed',
        verifiedNonce: '1789430112.44f991bc',
        memo: 'Lab compute credit settlement',
        upiRef: 'UPI-992817263541'
      },
      {
        id: 'TX-WIRE-4412',
        customerId: 'USR-8821',
        date: '2026-09-16 14:12:00',
        title: 'Wire to Nova Cybernetics LLC',
        category: 'Wire Transfer',
        paymentMethod: 'WIRE',
        amount: -1850.00,
        type: 'debit',
        account: 'ACC-CHK-9042',
        status: 'Completed',
        verifiedNonce: '1789429182.88a912fb',
        memo: 'Infrastructure server cluster retainer'
      },
      {
        id: 'TX-YIELD-8A47',
        customerId: 'USR-8821',
        date: '2026-09-15 09:30:15',
        title: 'Treasury Yield Credited',
        category: 'Investment',
        paymentMethod: 'AUTOMATED',
        amount: +2430.50,
        type: 'credit',
        account: 'ACC-SAV-8133',
        status: 'Completed',
        verifiedNonce: '1789401290.71e8812c',
        memo: 'Treasury bill monthly coupon reinvestment'
      }
    ];

    for (const tx of defaultTxs) {
      await this.put('transactions', tx);
    }

    // Initial Beneficiaries
    const defaultBeneficiaries = [
      { id: 'BEN-1', customerId: 'USR-8821', name: 'Nova Cybernetics LLC', accountOrUpi: '9840-2210-9941', type: 'WIRE', bankName: 'Apex Federal Reserve', routing: '021000021' },
      { id: 'BEN-2', customerId: 'USR-8821', name: 'DevSecOps Infrastructure', accountOrUpi: 'devsecops@upi', type: 'UPI', bankName: 'Aegis UPI Network', routing: 'AEGIS_UPI' },
      { id: 'BEN-3', customerId: 'USR-8821', name: 'Quantum Key Escrow Vault', accountOrUpi: '9840-7712-4402', type: 'WIRE', bankName: 'Zurich Private Custody', routing: '021000021' }
    ];

    for (const b of defaultBeneficiaries) {
      await this.put('beneficiaries', b);
    }

    // Initial Fixed Deposits (v2)
    const defaultFds = [
      {
        id: 'FD-2026-8801',
        customerId: 'USR-8821',
        depositNumber: 'FD-8801-4491',
        principal: 50000.00,
        tenureMonths: 12,
        interestRate: 7.25,
        maturityAmount: 53625.00,
        startDate: '2026-01-15',
        maturityDate: '2027-01-15',
        status: 'ACTIVE',
        interestPayout: 'ON_MATURITY'
      }
    ];

    for (const fd of defaultFds) {
      await this.put('fixed_deposits', fd);
    }

    // Initial Login Session (v2)
    const initialSession = {
      id: 'SESS-' + Date.now(),
      customerId: 'USR-8821',
      device: 'Kali Linux / Firefox 128 (Burp Suite Proxy)',
      ipAddress: '192.168.1.100',
      loginTime: new Date().toISOString(),
      status: 'ACTIVE'
    };
    await this.put('login_sessions', initialSession);
  }

  // Database CRUD operations
  async get(storeName, key) {
    return this.tx(storeName, 'readonly', store => store.get(key));
  }

  async getAll(storeName) {
    return this.tx(storeName, 'readonly', store => store.getAll());
  }

  async getByIndex(storeName, indexName, key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async put(storeName, value) {
    return this.tx(storeName, 'readwrite', store => store.put(value));
  }

  async delete(storeName, key) {
    return this.tx(storeName, 'readwrite', store => store.delete(key));
  }

  async count(storeName) {
    return this.tx(storeName, 'readonly', store => store.count());
  }

  async clear(storeName) {
    return this.tx(storeName, 'readwrite', store => store.clear());
  }
}

export const dbInstance = new DatabaseEngine();
