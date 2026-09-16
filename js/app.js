/**
 * AegisVault - Main Commercial Banking Orchestrator with UPI & IndexedDB
 */

import { CryptoEngine } from './crypto.js';
import { StateStore } from './state.js';
import { AuthManager } from './auth.js';
import { BankingEngine } from './banking.js';

class AppController {
  constructor() {
    this.store = new StateStore();
    this.auth = null;
    this.banking = null;

    this.soundEnabled = true;
    this.audioCtx = null;
    this.pendingTransfer = null;
  }

  async init() {
    await this.store.init();
    this.auth = new AuthManager(this.store);
    this.banking = new BankingEngine(this.store, this.auth, this.store.securityEngine);

    this.auth.init();
    this.initAudio();

    this.bindAuthPortal();
    this.bindNavigation();
    this.bindHeaderEvents();
    this.bindBankingEvents();
    this.bindUpiEvents();
    this.bindLendingEvents();
    this.bindSecurityEvents();
    this.bindModals();

    this.refreshTransferNonce();
    this.renderAll();

    if (!this.store.getState().isAuthenticated) {
      this.openAuthPortal('signin');
    }

    this.store.subscribe(() => {
      this.renderAll();
    });

    console.log('%c[AegisVault Bank]%c Real Persistent IndexedDB Online. UPI 2.0 Rails Active.', 'color:#06b6d4;font-weight:bold;', 'color:#10b981;');
  }

  initAudio() {
    const playTone = (freq, type = 'sine', duration = 0.08) => {
      if (!this.soundEnabled) return;
      try {
        if (!this.audioCtx) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          this.audioCtx = new AudioContext();
        }
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
        gain.gain.setValueAtTime(0.04, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + duration);
      } catch (e) {}
    };

    this.playSound = {
      click: () => playTone(800, 'sine', 0.04),
      success: () => { playTone(587, 'sine', 0.08); setTimeout(() => playTone(880, 'sine', 0.12), 80); },
      alert: () => { playTone(320, 'sawtooth', 0.15); setTimeout(() => playTone(240, 'sawtooth', 0.15), 120); },
      crypto: () => { playTone(1200, 'triangle', 0.05); }
    };
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'bx-info-circle';
    if (type === 'success') icon = 'bx-check-circle';
    if (type === 'error') icon = 'bx-error-circle';
    if (type === 'warning') icon = 'bx-alert-circle';

    toast.innerHTML = `
      <i class='bx ${icon}' style="font-size: 1.25rem;"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    if (type === 'error') this.playSound.alert();
    else if (type === 'success') this.playSound.success();
    else this.playSound.click();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // Authentication Portal
  bindAuthPortal() {
    const overlay = document.getElementById('auth-portal-overlay');
    const tabSignIn = document.getElementById('tab-btn-signin');
    const tabSignUp = document.getElementById('tab-btn-signup');
    const formSignIn = document.getElementById('form-signin');
    const formSignUp = document.getElementById('form-signup');

    tabSignIn.addEventListener('click', () => {
      this.playSound.click();
      tabSignIn.classList.add('active');
      tabSignUp.classList.remove('active');
      formSignIn.classList.add('active');
      formSignUp.classList.remove('active');
    });

    tabSignUp.addEventListener('click', () => {
      this.playSound.click();
      tabSignUp.classList.add('active');
      tabSignIn.classList.remove('active');
      formSignUp.classList.add('active');
      formSignIn.classList.remove('active');
    });

    document.getElementById('btn-quick-fill-vance')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('signin-email').value = 'alex.vance@aegisvault.internal';
      document.getElementById('signin-password').value = 'password123';
      this.playSound.click();
    });

    formSignIn.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('signin-email').value;
      const pass = document.getElementById('signin-password').value;

      const submitBtn = document.getElementById('btn-submit-signin');
      submitBtn.disabled = true;
      submitBtn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Authenticating in Database...";

      const res = await this.store.loginCustomer(email, pass);
      submitBtn.disabled = false;
      submitBtn.innerHTML = "<i class='bx bx-log-in-circle'></i> Secure Customer Login";

      if (res.success) {
        overlay.classList.remove('active');
        if (res.bypassed) {
          this.showToast(`[PENTEST ALERT] Authentication bypassed! Logged into ${res.customer.name}`, 'warning');
        } else {
          this.showToast(`Welcome back, ${res.customer.name}!`, 'success');
        }
        this.switchView('dashboard');
      } else {
        this.showToast(res.error, 'error');
      }
    });

    formSignUp.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('signup-name').value;
      const email = document.getElementById('signup-email').value;
      const pass = document.getElementById('signup-pass').value;
      const pin = document.getElementById('signup-pin').value;
      const accountType = document.getElementById('signup-acctype').value;
      const deposit = document.getElementById('signup-deposit').value;

      if (pin.length !== 4 || isNaN(pin)) {
        this.showToast('Please enter a 4-digit numeric Transaction PIN', 'error');
        return;
      }

      const submitBtn = document.getElementById('btn-submit-signup');
      submitBtn.disabled = true;
      submitBtn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Committing to Database...";

      const res = await this.store.registerCustomer({
        name,
        email,
        password: pass,
        pin,
        accountType,
        initialDeposit: deposit
      });

      submitBtn.disabled = false;
      submitBtn.innerHTML = "<i class='bx bx-user-plus'></i> Open Account & Generate Keys";

      if (res.success) {
        overlay.classList.remove('active');
        this.showToast(`Customer account & UPI ID created for ${name}!`, 'success');
        this.switchView('dashboard');
      } else {
        this.showToast(res.error, 'error');
      }
    });

    document.getElementById('btn-open-auth-modal')?.addEventListener('click', () => {
      this.openAuthPortal('signin');
    });

    document.getElementById('btn-add-customer-profile')?.addEventListener('click', () => {
      this.openAuthPortal('signup');
    });

    document.getElementById('btn-logout')?.addEventListener('click', async () => {
      await this.store.logout();
      this.showToast('Signed out of customer banking portal.', 'info');
      this.openAuthPortal('signin');
    });
  }

  openAuthPortal(tab = 'signin') {
    const overlay = document.getElementById('auth-portal-overlay');
    overlay.classList.add('active');
    if (tab === 'signin') {
      document.getElementById('tab-btn-signin').click();
    } else {
      document.getElementById('tab-btn-signup').click();
    }
  }

  // Navigation
  bindNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.playSound.click();
        const viewName = link.getAttribute('data-view');
        this.switchView(viewName);
        document.getElementById('sidebar').classList.remove('open');
      });
    });

    document.getElementById('mobile-nav-btn')?.addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });

    document.getElementById('btn-quick-transfer')?.addEventListener('click', () => {
      this.switchView('transfers');
    });

    document.getElementById('btn-nav-security')?.addEventListener('click', () => {
      this.switchView('security');
    });
  }

  switchView(viewName) {
    document.querySelectorAll('.nav-link').forEach(l => {
      l.classList.toggle('active', l.getAttribute('data-view') === viewName);
    });

    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `view-${viewName}`);
    });

    const titles = {
      dashboard: { title: 'Executive Dashboard', subtitle: 'Real-time asset telemetry & institutional reserves' },
      accounts: { title: 'Accounts & Cards Studio', subtitle: 'Multi-currency liquidity & hardware key vaults' },
      transfers: { title: 'Wire & Transfer Hub', subtitle: 'Zero-trust cryptographic transaction routing' },
      upi: { title: 'Unified Payments Interface (UPI 2.0)', subtitle: 'Instant real-time VPA settlement & dynamic QR payments' },
      loans: { title: 'Credit & Lending Facilities', subtitle: 'Commercial expansion lines & institutional capital' },
      security: { title: 'Security & Compliance Center', subtitle: 'Cryptographic proofs, defense posture, and SIEM forwarding' },
      profile: { title: 'Customer Profile & KYC', subtitle: 'Level 3 Enterprise Client tier & authorized identities' }
    };

    if (titles[viewName]) {
      document.getElementById('page-title').textContent = titles[viewName].title;
      document.getElementById('page-subtitle').textContent = titles[viewName].subtitle;
    }

    if (viewName === 'transfers') {
      this.refreshTransferNonce();
    }
  }

  bindHeaderEvents() {
    const themeBtn = document.getElementById('theme-toggle-btn');
    const savedTheme = localStorage.getItem('aegisvault_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeBtn.innerHTML = savedTheme === 'light' ? "<i class='bx bx-moon'></i>" : "<i class='bx bx-sun'></i>";

    themeBtn.addEventListener('click', () => {
      this.playSound.click();
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('aegisvault_theme', next);
      themeBtn.innerHTML = next === 'light' ? "<i class='bx bx-moon'></i>" : "<i class='bx bx-sun'></i>";
    });

    const soundBtn = document.getElementById('sound-toggle-btn');
    soundBtn.addEventListener('click', () => {
      this.soundEnabled = !this.soundEnabled;
      soundBtn.innerHTML = this.soundEnabled ? "<i class='bx bx-volume-full'></i>" : "<i class='bx bx-volume-mute'></i>";
      this.showToast(`Audio cues ${this.soundEnabled ? 'Enabled' : 'Muted'}`, 'info');
    });

    document.getElementById('totp-header-btn')?.addEventListener('click', () => {
      this.openModal('modal-totp-generator');
    });

    window.addEventListener('totp-tick', (e) => {
      const { code, secondsLeft } = e.detail;
      document.getElementById('header-totp-val').textContent = code;
      document.getElementById('header-totp-timer').textContent = `(${secondsLeft}s)`;
      document.getElementById('modal-totp-code').textContent = code;
      document.getElementById('modal-totp-countdown').textContent = `Expires in ${secondsLeft}s`;
    });

    window.addEventListener('session-tick', (e) => {
      const sec = e.detail.remainingSeconds;
      const mins = Math.floor(sec / 60).toString().padStart(2, '0');
      const remainingSec = (sec % 60).toString().padStart(2, '0');
      document.getElementById('header-watchdog-time').textContent = `${mins}:${remainingSec}`;
    });

    window.addEventListener('session-expired', () => {
      this.showToast('Security Inactivity Timeout: Session locked.', 'warning');
      this.openAuthPortal('signin');
    });
  }

  refreshTransferNonce() {
    const nonce = CryptoEngine.generateNonce();
    const el = document.getElementById('transfer-nonce-preview');
    if (el) {
      el.textContent = nonce;
      this.currentTransferNonce = nonce;
    }
  }

  // Banking Operations
  bindBankingEvents() {
    // 3D Card Flip
    const flipBtn = document.getElementById('btn-flip-card-dash');
    const cardEl = document.getElementById('dash-virtual-card');
    if (flipBtn && cardEl) {
      flipBtn.addEventListener('click', () => {
        this.playSound.click();
        cardEl.classList.toggle('flipped');
      });
      cardEl.addEventListener('click', () => {
        this.playSound.click();
        cardEl.classList.toggle('flipped');
      });
    }

    document.getElementById('btn-freeze-card-dash')?.addEventListener('click', async () => {
      const customer = this.store.getCurrentCustomer();
      if (!customer || !this.store.cards[0]) return;
      const isFrozen = await this.banking.toggleCardFreeze(this.store.cards[0].id);
      document.getElementById('dash-freeze-text').textContent = isFrozen ? 'Unfreeze Card' : 'Freeze Card';
      this.showToast(`Card ${isFrozen ? 'FROZEN. Online charges blocked.' : 'UNFROZEN. Active.'}`, isFrozen ? 'warning' : 'success');
    });

    document.getElementById('btn-regen-card-dash')?.addEventListener('click', async () => {
      const customer = this.store.getCurrentCustomer();
      if (!customer || !this.store.cards[0]) return;
      const updated = await this.banking.regenerateCard(this.store.cards[0].id);
      this.playSound.crypto();
      this.showToast(`Dynamic CVV ${updated.cvv} generated!`, 'success');
    });

    document.getElementById('btn-export-csv')?.addEventListener('click', () => {
      this.banking.exportLedgerAsCSV();
      this.showToast('Statement CSV exported from IndexedDB.', 'success');
    });

    // Wire Transfer Submission
    const transferForm = document.getElementById('wire-transfer-form');
    if (transferForm) {
      transferForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.playSound.click();

        const sourceAccountId = document.getElementById('transfer-source-acc').value;
        const recipientName = document.getElementById('transfer-recipient-name').value;
        const recipientAccount = document.getElementById('transfer-recipient-account').value;
        const routingNumber = document.getElementById('transfer-routing-num').value;
        const amount = document.getElementById('transfer-amount').value;
        const memo = document.getElementById('transfer-memo').value;

        this.pendingTransfer = {
          sourceAccountId,
          recipientName,
          recipientAccount,
          routingNumber,
          amount,
          memo,
          nonce: this.currentTransferNonce
        };

        document.getElementById('modal-auth-amount').textContent = `$${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        document.getElementById('modal-auth-recipient').textContent = recipientName;
        document.getElementById('auth-input-pin').value = '';
        document.getElementById('auth-input-totp').value = '';
        this.openModal('modal-auth-transfer');
      });
    }

    document.getElementById('btn-confirm-transfer-auth')?.addEventListener('click', async () => {
      const pin = document.getElementById('auth-input-pin').value;
      const totp = document.getElementById('auth-input-totp').value;

      if (!pin) {
        this.showToast('Please enter your 4-digit transaction PIN', 'error');
        return;
      }

      const payload = {
        ...this.pendingTransfer,
        pin,
        totpCode: totp
      };

      const btn = document.getElementById('btn-confirm-transfer-auth');
      btn.disabled = true;
      btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Authorizing Wire...";

      const result = await this.banking.executeTransfer(payload);
      btn.disabled = false;
      btn.innerHTML = "<i class='bx bx-check'></i> Authorize Wire";

      if (result.success) {
        this.closeModal('modal-auth-transfer');
        this.showToast(`Wire transfer of $${parseFloat(payload.amount).toFixed(2)} committed to database!`, 'success');
        document.getElementById('wire-transfer-form').reset();
        this.refreshTransferNonce();
        this.switchView('dashboard');
      } else {
        this.showToast(result.error, 'error');
      }
    });

    document.getElementById('btn-cancel-transfer')?.addEventListener('click', () => {
      this.closeModal('modal-auth-transfer');
    });
  }

  // UPI Payments & Bills
  bindUpiEvents() {
    // Quick chips
    document.querySelectorAll('.upi-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.playSound.click();
        document.getElementById('upi-recipient-id').value = chip.getAttribute('data-upi');
      });
    });

    // UPI Transfer Form
    document.getElementById('form-upi-transfer')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const targetUpiId = document.getElementById('upi-recipient-id').value;
      const amount = document.getElementById('upi-amount-input').value;
      const note = document.getElementById('upi-note-input').value;
      const pin = document.getElementById('upi-pin-input').value;

      const submitBtn = document.getElementById('btn-submit-upi');
      submitBtn.disabled = true;
      submitBtn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Processing UPI Payment...";

      const res = await this.banking.executeUpiPayment({
        targetUpiId,
        amount,
        note,
        pin
      });

      submitBtn.disabled = false;
      submitBtn.innerHTML = "<i class='bx bx-check-circle'></i> Authorize & Send Instant UPI";

      if (res.success) {
        this.showToast(`UPI Transfer of $${parseFloat(amount).toFixed(2)} successful! Ref: ${res.upiRef}`, 'success');
        document.getElementById('form-upi-transfer').reset();
        this.switchView('dashboard');
      } else {
        this.showToast(res.error, 'error');
      }
    });

    // Bill Pay Form
    document.getElementById('form-bill-pay')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const cat = document.getElementById('bill-category-select').value;
      const consumer = document.getElementById('bill-consumer-num').value;
      const amount = document.getElementById('bill-amount-input').value;
      const pin = prompt('Enter your 4-Digit Transaction PIN to authorize bill payment:') || '';

      if (!pin) return;

      const res = await this.banking.payUtilityBill(cat, `${cat} Provider`, consumer, amount, pin);
      if (res.success) {
        this.showToast(`Bill payment of $${parseFloat(amount).toFixed(2)} settled successfully!`, 'success');
        document.getElementById('form-bill-pay').reset();
        this.switchView('dashboard');
      } else {
        this.showToast(res.error, 'error');
      }
    });

    // Copy UPI ID
    document.getElementById('btn-copy-upi')?.addEventListener('click', () => {
      const upiText = document.getElementById('customer-upi-display').textContent.trim();
      navigator.clipboard.writeText(upiText);
      this.showToast(`UPI ID ${upiText} copied to clipboard!`, 'info');
    });

    document.getElementById('btn-share-upi-link')?.addEventListener('click', () => {
      const upiText = document.getElementById('customer-upi-display').textContent.trim();
      const link = `upi://pay?pa=${upiText}&pn=${encodeURIComponent(this.store.currentCustomer.name)}&cu=USD`;
      navigator.clipboard.writeText(link);
      this.showToast('UPI Payment deep-link copied to clipboard!', 'success');
    });
  }

  // Credit & Lending
  bindLendingEvents() {
    const loanAmountInput = document.getElementById('loan-amount-input');
    const updatePreview = () => {
      const amt = parseFloat(loanAmountInput.value) || 0;
      const monthly = (amt * 0.052 / 12) + (amt / 60);
      document.getElementById('loan-monthly-preview').textContent = `$${monthly.toFixed(2)} / mo`;
    };

    loanAmountInput?.addEventListener('input', updatePreview);

    document.getElementById('loan-application-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const amount = loanAmountInput.value;
      const purpose = document.getElementById('loan-purpose-select').value;

      const res = await this.banking.applyForCreditLine(amount, purpose);
      if (res.success) {
        this.showToast(`Credit facility for $${parseFloat(amount).toLocaleString()} funded into checking!`, 'success');
        this.switchView('dashboard');
      } else {
        this.showToast(res.error, 'error');
      }
    });
  }

  // Security & Compliance
  bindSecurityEvents() {
    const modeSelect = document.getElementById('security-mode-select');
    if (modeSelect) {
      modeSelect.value = this.store.securityEngine.getSecurityMode();
      modeSelect.addEventListener('change', (e) => {
        this.store.securityEngine.setSecurityMode(e.target.value);
        const isHardened = this.store.securityEngine.isHardened();
        const descEl = document.getElementById('sec-mode-description');
        const badgeEl = document.getElementById('sidebar-sec-badge');
        const headerBadge = document.getElementById('header-defense-mode');

        if (isHardened) {
          descEl.textContent = 'OWASP Top 10 protection active: Parameterized queries, context encoding, anti-replay nonces.';
          descEl.style.color = 'var(--accent-cyan)';
          badgeEl.textContent = 'HARDENED';
          badgeEl.style.background = 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))';
          headerBadge.textContent = 'DEFENSE ENFORCED';
          this.showToast('Security posture: Hardened Production Defense', 'success');
        } else {
          descEl.textContent = 'Security Assessment Mode active: Defenses relaxed for vulnerability verification.';
          descEl.style.color = 'var(--accent-amber)';
          badgeEl.textContent = 'ASSESSMENT';
          badgeEl.style.background = 'linear-gradient(135deg, var(--accent-amber), var(--accent-rose))';
          headerBadge.textContent = 'ASSESSMENT MODE';
          this.showToast('Security posture: Security Assessment (Pentest Target)', 'warning');
        }
      });
    }

    const siemInput = document.getElementById('siem-webhook-input');
    if (siemInput) {
      siemInput.value = this.store.securityEngine.siemWebhookUrl;
      siemInput.addEventListener('change', (e) => {
        this.store.securityEngine.setSiemWebhook(e.target.value);
        this.showToast('SIEM forwarder destination updated.', 'info');
      });
    }

    document.getElementById('btn-toggle-siem')?.addEventListener('click', () => {
      const nextState = !this.store.securityEngine.isSiemForwarding;
      this.store.securityEngine.toggleSiemForwarding(nextState);
      const label = document.getElementById('siem-toggle-label');
      label.textContent = nextState ? 'Disable SIEM Stream' : 'Enable SIEM Stream';
      this.showToast(`SIEM telemetry forwarding ${nextState ? 'Enabled' : 'Disabled'}.`, 'info');
    });

    document.getElementById('btn-test-siem-ping')?.addEventListener('click', async () => {
      await this.store.securityEngine.logSecurityEvent(
        'SIEM_HEARTBEAT_TEST',
        'Manual SIEM connectivity heartbeat test from AegisVault.',
        'INFO'
      );
      this.showToast('Heartbeat event logged and forwarded to SIEM webhook!', 'success');
    });

    document.getElementById('btn-verify-audit-chain')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-verify-audit-chain');
      btn.disabled = true;
      btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Verifying cryptographic proofs...";

      const check = await this.store.audit.verifyChainIntegrity();
      btn.disabled = false;
      btn.innerHTML = "<i class='bx bx-badge-check'></i> Verify Chain Integrity (SHA-256)";

      const badge = document.getElementById('chain-status-badge');
      if (check.intact) {
        badge.textContent = `Chain Intact (${check.verifiedCount} proofs verified)`;
        badge.className = 'badge-status badge-completed';
        this.showToast(`All ${check.verifiedCount} cryptographic audit links mathematically valid!`, 'success');
      } else {
        badge.textContent = 'TAMPERING DETECTED';
        badge.className = 'badge-status btn-danger';
        this.showToast(check.reason, 'error');
      }
    });

    document.getElementById('btn-reset-demo')?.addEventListener('click', async () => {
      await this.store.resetDemoData();
      this.showToast('IndexedDB database and audit ledger reset to factory defaults.', 'success');
    });
  }

  bindModals() {
    document.getElementById('btn-close-totp-modal')?.addEventListener('click', () => this.closeModal('modal-totp-generator'));
    document.getElementById('btn-done-totp')?.addEventListener('click', () => this.closeModal('modal-totp-generator'));
    document.getElementById('btn-copy-totp')?.addEventListener('click', () => {
      const code = document.getElementById('modal-totp-code').textContent.trim();
      navigator.clipboard.writeText(code);
      this.showToast(`2FA code ${code} copied to clipboard!`, 'info');
    });
    document.getElementById('btn-close-auth-modal')?.addEventListener('click', () => this.closeModal('modal-auth-transfer'));
  }

  openModal(id) {
    document.getElementById(id)?.classList.add('active');
  }

  closeModal(id) {
    document.getElementById(id)?.classList.remove('active');
  }

  // DOM Rendering
  renderAll() {
    const customer = this.store.getCurrentCustomer();
    if (!customer) return;

    document.getElementById('sidebar-username').textContent = customer.name;
    document.getElementById('sidebar-avatar').textContent = customer.avatar || 'AV';
    document.getElementById('sidebar-usertier').innerHTML = `<i class='bx bxs-badge-check'></i> ${customer.clientTier}`;

    const totalNetWorth = this.banking.getTotalNetWorth();
    document.getElementById('dash-total-networth').textContent = `$${totalNetWorth.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    const secScore = this.store.calculateSecurityScore();
    document.getElementById('dash-sec-score').textContent = `${secScore} / 100`;
    document.getElementById('dash-kyc-tier').textContent = customer.kycStatus || 'Level 3 Enterprise';

    // Customer UPI Display
    const upiDisplay = customer.upiId || `${customer.email.split('@')[0]}@aegis`;
    const customerUpiEl = document.getElementById('customer-upi-display');
    if (customerUpiEl) customerUpiEl.textContent = upiDisplay;

    if (this.store.cards && this.store.cards[0]) {
      const card = this.store.cards[0];
      document.getElementById('dash-card-number').textContent = card.cardNumber;
      document.getElementById('dash-card-holder').textContent = card.holderName;
      document.getElementById('dash-card-cvv').textContent = card.cvv;
      document.getElementById('dash-freeze-text').textContent = card.frozen ? 'Unfreeze Card' : 'Freeze Card';
    }

    // Dashboard Accounts List
    const dashAccountsList = document.getElementById('dash-accounts-list');
    if (dashAccountsList) {
      dashAccountsList.innerHTML = this.store.accounts.map(acc => `
        <div class="account-card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
            <div>
              <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 500;">${acc.name}</div>
              <div style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary);">$${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            </div>
            <span class="badge-status badge-completed">${acc.type}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-secondary); font-family: var(--font-mono);">
            <span>${acc.accountNumber}</span>
            <span>Limit: $${(acc.dailyLimit / 1000).toFixed(0)}k/day</span>
          </div>
        </div>
      `).join('');
    }

    // Accounts View Grid
    const accountsGrid = document.getElementById('accounts-cards-grid');
    if (accountsGrid) {
      accountsGrid.innerHTML = this.store.accounts.map(acc => `
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <i class='bx bx-credit-card-front'></i>
              <span>${acc.type} Reserve</span>
            </div>
            <span class="badge-status badge-completed">${acc.status}</span>
          </div>
          <div style="font-size: 1.6rem; font-weight: 800; margin-bottom: 0.25rem;">
            $${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 1rem;">${acc.name}</p>
          <div style="border-top: 1px solid var(--border-glass); padding-top: 0.75rem; font-size: 0.8rem; display: flex; flex-direction: column; gap: 0.35rem;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Account #:</span>
              <span style="font-family: var(--font-mono);">${acc.accountNumber}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Routing / SWIFT:</span>
              <span style="font-family: var(--font-mono);">${acc.routingNumber}</span>
            </div>
          </div>
        </div>
      `).join('');
    }

    // Cards Studio Grid
    const cardsGrid = document.getElementById('cards-studio-grid');
    if (cardsGrid) {
      cardsGrid.innerHTML = this.store.cards.map(card => `
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <strong>${card.type}</strong>
            <span class="badge-status ${card.frozen ? 'btn-danger' : 'badge-completed'}">
              ${card.frozen ? 'FROZEN' : 'ACTIVE'}
            </span>
          </div>
          <div style="font-family: var(--font-mono); font-size: 1.2rem; letter-spacing: 0.1em; margin-bottom: 0.5rem;">
            ${card.cardNumber}
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 1.25rem;">
            <span>EXP: ${card.expiry}</span>
            <span>CVV: ${card.cvv}</span>
            <span>Limit: $${card.contactlessLimit}</span>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-secondary btn-sm" onclick="window.app.toggleCard('${card.id}')">
              ${card.frozen ? 'Unfreeze' : 'Freeze'}
            </button>
            <button class="btn btn-secondary btn-sm" onclick="window.app.regenCard('${card.id}')">
              New Token
            </button>
          </div>
        </div>
      `).join('');
    }

    // Transfer Select Options
    const transferSelect = document.getElementById('transfer-source-acc');
    if (transferSelect) {
      transferSelect.innerHTML = this.store.accounts.map(acc => `
        <option value="${acc.id}">${acc.name} — $${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</option>
      `).join('');
    }

    // Dashboard Transactions Table
    const txTbody = document.getElementById('dash-tx-tbody');
    if (txTbody) {
      txTbody.innerHTML = this.store.transactions.slice(0, 8).map(tx => {
        const isCredit = tx.amount > 0;
        const sign = isCredit ? '+' : '';
        const methodBadge = tx.paymentMethod === 'UPI' 
          ? `<span class="badge-status" style="background: rgba(16,185,129,0.2); color: var(--accent-emerald);">UPI</span>`
          : `<span class="badge-status" style="background: rgba(255,255,255,0.05);">${tx.category}</span>`;

        return `
          <tr>
            <td>
              <div class="tx-title-cell">
                <div class="tx-icon-circle" style="background: ${isCredit ? 'var(--accent-emerald-glow)' : 'rgba(255,255,255,0.05)'}; color: ${isCredit ? 'var(--accent-emerald)' : 'var(--text-primary)'};">
                  <i class='bx ${isCredit ? 'bx-down-arrow-alt' : 'bx-up-arrow-alt'}'></i>
                </div>
                <div>
                  <div style="font-weight: 600;">${tx.title}</div>
                  <div style="font-size: 0.72rem; color: var(--text-muted);">${tx.memo || 'No memo'}</div>
                </div>
              </div>
            </td>
            <td>${methodBadge}</td>
            <td style="font-size: 0.8rem; color: var(--text-secondary);">${tx.date}</td>
            <td><span class="badge-status badge-completed"><i class='bx bx-check'></i> Verified</span></td>
            <td class="tx-amount ${isCredit ? 'credit' : 'debit'}">${sign}$${Math.abs(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          </tr>
        `;
      }).join('');
    }

    // UPI History Feed Table
    const upiTbody = document.getElementById('upi-history-tbody');
    if (upiTbody) {
      const upiTxs = this.store.transactions.filter(t => t.paymentMethod === 'UPI');
      if (upiTxs.length === 0) {
        upiTbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">No UPI transactions yet. Send your first UPI payment on the left!</td></tr>`;
      } else {
        upiTbody.innerHTML = upiTxs.slice(0, 6).map(tx => `
          <tr>
            <td>
              <strong style="font-size: 0.85rem;">${tx.title}</strong>
              <div style="font-size: 0.72rem; color: var(--text-muted);">${tx.memo}</div>
            </td>
            <td><span class="badge-status" style="font-family: var(--font-mono); font-size: 0.72rem;">${tx.upiRef || 'UPI-REF-001'}</span></td>
            <td class="tx-amount debit" style="color: var(--accent-emerald);">${tx.amount < 0 ? '-' : '+'}$${Math.abs(tx.amount).toFixed(2)}</td>
          </tr>
        `).join('');
      }
    }

    // Quick Payees
    const quickPayeesList = document.getElementById('quick-payees-list');
    if (quickPayeesList) {
      quickPayeesList.innerHTML = this.store.beneficiaries.map(p => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 0.85rem; background: var(--surface-glass); border: 1px solid var(--border-glass); border-radius: var(--radius-sm); cursor: pointer;" onclick="window.app.fillPayee('${p.name}', '${p.accountOrUpi}', '${p.routing}')">
          <div>
            <div style="font-size: 0.88rem; font-weight: 600;">${p.name}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">${p.accountOrUpi} (${p.type})</div>
          </div>
          <button class="btn btn-secondary btn-sm" style="padding: 2px 8px; font-size: 0.75rem;">Select</button>
        </div>
      `).join('');
    }

    // Profile View Details
    document.getElementById('profile-name').textContent = customer.name;
    document.getElementById('profile-email').textContent = customer.email;
    document.getElementById('profile-big-avatar').textContent = customer.avatar || 'AV';
    document.getElementById('profile-tier-badge').textContent = customer.clientTier;
    document.getElementById('profile-joined').textContent = customer.joinedDate || '2024-03-15';
    document.getElementById('profile-kyc').textContent = customer.kycStatus || 'Level 3 Enterprise';
    document.getElementById('profile-credit-score').textContent = `${customer.creditScore} (Exceptional)`;

    // Customer Switcher List in Profile
    const profilesList = document.getElementById('customers-profiles-list');
    if (profilesList) {
      profilesList.innerHTML = this.store.customersList.map(c => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.85rem 1rem; background: var(--surface-glass); border: 1px solid ${c.id === customer.id ? 'var(--accent-cyan)' : 'var(--border-glass)'}; border-radius: var(--radius-sm);">
          <div>
            <div style="font-size: 0.95rem; font-weight: 600;">
              ${c.name} ${c.id === customer.id ? '<span class="badge-status badge-completed" style="font-size: 0.65rem; margin-left: 6px;">ACTIVE</span>' : ''}
            </div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">${c.email} • ${c.upiId} • ${c.tier}</div>
          </div>
          ${c.id !== customer.id ? `<button class="btn btn-secondary btn-sm" onclick="window.app.switchCustomer('${c.id}')"><i class='bx bx-user-check'></i> Switch</button>` : ''}
        </div>
      `).join('');
    }

    // Audit Log Table
    const auditTbody = document.getElementById('audit-log-tbody');
    if (auditTbody) {
      const logs = this.store.audit.getLogs();
      auditTbody.innerHTML = logs.map(log => {
        let sevClass = 'badge-completed';
        if (log.severity === 'WARN') sevClass = 'badge-pending';
        if (log.severity === 'SECURITY_ALERT' || log.severity === 'CRITICAL') sevClass = 'btn-danger';
        const shortHash = log.hash ? log.hash.substring(0, 16) + '...' : 'GENESIS';

        return `
          <tr>
            <td>
              <div style="font-family: var(--font-mono); font-size: 0.78rem;">${log.id}</div>
              <div style="font-size: 0.7rem; color: var(--text-muted);">${log.timestamp.substring(0, 19).replace('T', ' ')}</div>
            </td>
            <td><strong>${log.eventType}</strong></td>
            <td><span class="badge-status ${sevClass}">${log.severity}</span></td>
            <td style="font-size: 0.82rem; max-width: 320px;">${log.description}</td>
            <td>
              <span class="badge-status" style="font-family: var(--font-mono); font-size: 0.72rem; background: #05070e;" title="${log.hash}">
                ${shortHash}
              </span>
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  async toggleCard(id) {
    const isFrozen = await this.banking.toggleCardFreeze(id);
    this.showToast(`Card ${isFrozen ? 'frozen' : 'activated'}`, 'info');
  }

  async regenCard(id) {
    await this.banking.regenerateCard(id);
    this.showToast('Card CVV and dynamic token regenerated in database', 'success');
  }

  fillPayee(name, accOrUpi, rout) {
    if (rout === 'AEGIS_UPI') {
      this.switchView('upi');
      document.getElementById('upi-recipient-id').value = accOrUpi;
      this.showToast(`Recipient ${name} (${accOrUpi}) loaded into UPI form.`, 'info');
    } else {
      this.switchView('transfers');
      document.getElementById('transfer-recipient-name').value = name;
      document.getElementById('transfer-recipient-account').value = accOrUpi;
      document.getElementById('transfer-routing-num').value = rout;
      this.showToast(`Beneficiary ${name} loaded into wire form.`, 'info');
    }
  }

  async switchCustomer(userId) {
    const customer = await this.store.switchUser(userId);
    if (customer) {
      this.showToast(`Switched active profile to ${customer.name}`, 'success');
      this.switchView('dashboard');
    }
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  window.app = new AppController();
  await window.app.init();
});
