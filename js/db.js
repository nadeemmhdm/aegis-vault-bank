/**
 * AegisVault - Native IndexedDB Real Persistent Database Engine
 * Implements an asynchronous client-side relational database for:
 * - Customers
 * - Accounts
 * - Virtual Cards
 * - Transactions & UPI Payments
 * - Beneficiaries & UPI Contacts
 * - Audit Trail (Cryptographic SHA-256 Chained Logs)
 */

import { CryptoEngine } from './crypto.js';

const DB_NAME = 'AegisVault_Commercial_DB';
const DB_VERSION = 1;

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

  // Seed default private banking customer Alex Vance if database is fresh
  async seedInitialDataIfEmpty() {
    const customerCount = await this.count('customers');
    if (customerCount > 0) return;

    console.log('[IndexedDB] Database is empty. Seeding initial private client records...');

    const salt = 'aegis_salt_vance_2026';
    const passwordHash = await CryptoEngine.sha256('password123' + salt);
    const pinHash = await CryptoEngine.sha256('1234');

    const defaultCustomer = {
      id: 'USR-8821',
      name: 'Alex Vance',
      email: 'alex.vance@aegisvault.internal',
      upiId: 'alex.vance@aegis',
      passwordHash,
      salt,
      pinHash,
      pin: '1234',
      clientTier: 'Aegis Private Client Elite',
      kycStatus: 'Verified (Level 3 Enterprise)',
      creditScore: 815,
      avatar: 'AV',
      phone: '+1 (555) 019-2834',
      twoFactorEnabled: true,
      biometricsEnabled: true,
      joinedDate: '2024-03-15'
    };

    await this.put('customers', defaultCustomer);

    // Initial Accounts
    const defaultAccounts = [
      {
        id: 'ACC-CHK-9042',
        customerId: 'USR-8821',
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
        customerId: 'USR-8821',
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
        customerId: 'USR-8821',
        type: 'Cold Vault',
        name: 'Institutional Cold Vault Reserve',
        accountNumber: 'VLT-SECURE-9901',
        routingNumber: '021000021',
        balance: 620000.00,
        currency: 'USD',
        status: 'Hardware Enforced',
        dailyLimit: 100000,
        spentToday: 0.00
      }
    ];

    for (const acc of defaultAccounts) {
      await this.put('accounts', acc);
    }

    // Initial Cards
    const defaultCards = [
      {
        id: 'CRD-9921',
        customerId: 'USR-8821',
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
        customerId: 'USR-8821',
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
    ];

    for (const card of defaultCards) {
      await this.put('cards', card);
    }

    // Initial Transactions (including UPI and Wires)
    const defaultTxs = [
      {
        id: 'TX-UPI-7719',
        customerId: 'USR-8821',
        date: '2026-09-16 17:30:00',
        title: 'UPI Payment to cloudprovider@upi',
        category: 'UPI Instant',
        paymentMethod: 'UPI',
        amount: -249.99,
        type: 'debit',
        account: 'ACC-CHK-9042',
        status: 'Completed',
        upiRef: 'UPI-984022108849',
        verifiedNonce: '1789551200.a1b2c3d4',
        memo: 'Enterprise DNS & Cloudflare tunnel license'
      },
      {
        id: 'TX-WIRE-9B38',
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
      { id: 'BEN-1', customerId: 'USR-8821', name: 'Nova Cybernetics LLC', accountOrUpi: '9840-2210-9941', type: 'WIRE', routing: '021000021' },
      { id: 'BEN-2', customerId: 'USR-8821', name: 'DevSecOps Infrastructure', accountOrUpi: 'devsecops@upi', type: 'UPI', routing: 'AEGIS_UPI' },
      { id: 'BEN-3', customerId: 'USR-8821', name: 'Quantum Key Escrow Vault', accountOrUpi: '9840-7712-4402', type: 'WIRE', routing: '021000021' }
    ];

    for (const b of defaultBeneficiaries) {
      await this.put('beneficiaries', b);
    }
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
