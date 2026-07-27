(() => {
  'use strict';

  const config = window.FINORA_CONFIG || {};
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const todayISO = () => new Date().toISOString().slice(0, 10);
  const nowISO = () => new Date().toISOString();
  const id = () => (crypto.randomUUID ? crypto.randomUUID() : `id_${Date.now()}_${Math.random().toString(16).slice(2)}`);
  const storageKey = (key) => `${config.STORAGE_PREFIX || 'finora'}_${key}`;

  const els = {};
  let supabaseClient = null;
  let sessionToken = sessionStorage.getItem(storageKey('sessionToken')) || '';
  let currentUser = safeParse(sessionStorage.getItem(storageKey('currentUser'))) || null;
  let state = null;
  let activeRoute = 'dashboard';
  let saveTimer = null;
  let dirty = false;

  function defaultState() {
    const createdAt = nowISO();
    return {
      meta: {
        version: config.VERSION || '2.0.6',
        currency: config.DEFAULT_CURRENCY || 'PHP',
        locale: config.DEFAULT_LOCALE || 'en-PH',
        theme: 'system',
        hideBalances: false,
        updatedAt: createdAt
      },
      accounts: [
        { id: id(), name: 'Cash', type: 'wallet', institution: '', currency: 'PHP', openingBalance: 0, emoji: '💵', color: '#2557ff', includeNetWorth: true, dueDate: '', notes: '', createdAt },
        { id: id(), name: 'Bank Account', type: 'bank', institution: '', currency: 'PHP', openingBalance: 0, emoji: '🏦', color: '#20c8ff', includeNetWorth: true, dueDate: '', notes: '', createdAt },
        { id: id(), name: 'Savings', type: 'savings', institution: '', currency: 'PHP', openingBalance: 0, emoji: '💎', color: '#7b61ff', includeNetWorth: true, dueDate: '', notes: '', createdAt },
        { id: id(), name: 'Credit Card', type: 'credit', institution: '', currency: 'PHP', openingBalance: 0, emoji: '💳', color: '#3142ff', includeNetWorth: true, dueDate: '', notes: '', createdAt },
        { id: id(), name: 'Loan', type: 'loan', institution: '', currency: 'PHP', openingBalance: 0, emoji: '📄', color: '#e5484d', includeNetWorth: true, dueDate: '', notes: '', createdAt }
      ],
      transactions: [],
      budgets: [],
      goals: [],
      recurring: [],
      reminders: [],
      settings: {
        showWelcomeTips: true
      }
    };
  }

  function safeParse(value, fallback = null) {
    try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
  }

  function init() {
    bindElements();
    applyBranding();
    checkConfigStatus();
    initSupabase();
    bindEvents();
    restoreTheme();
    clearLegacyPersistentSession();

    if (sessionToken) {
      showLoadingAuth('Restoring session…');
      loadRemoteState().catch((error) => {
        console.error(error);
        clearSession();
        showAuth();
        setNotice(els.loginNotice, 'Session expired. Please log in again.', 'info');
      });
    } else {
      showAuth();
    }

    if ('serviceWorker' in navigator && config.FEATURES?.PWA) {
      window.addEventListener('load', () => navigator.serviceWorker.register('service-worker.js').catch(() => {}));
    }
  }

  function bindElements() {
    Object.assign(els, {
      authGate: $('#authGate'), appShell: $('#appShell'), authTabs: $('#authTabs'), loginForm: $('#loginForm'), forgotForm: $('#forgotForm'),
      loginNotice: $('#loginNotice'), forgotNotice: $('#forgotNotice'), configStatus: $('#configStatus'), sideNav: $('#sideNav'), pageTitle: $('#pageTitle'), pageEyebrow: $('#pageEyebrow'),
      logoutButton: $('#logoutButton'), quickAddButton: $('#quickAddButton'), addTransactionButton: $('#addTransactionButton'), addAccountButton: $('#addAccountButton'),
      addBudgetButton: $('#addBudgetButton'), addGoalButton: $('#addGoalButton'), addRecurringButton: $('#addRecurringButton'), addReminderButton: $('#addReminderButton'),
      syncButton: $('#syncButton'), saveState: $('#saveState'), modalRoot: $('#modalRoot'), toast: $('#toast'), currentUserName: $('#currentUserName'),
      currentUserRole: $('#currentUserRole'), currentUserAvatar: $('#currentUserAvatar'), toggleBalances: $('#toggleBalances'), heroEyeButton: $('#heroEyeButton'),
      transactionSearch: $('#transactionSearch'), typeFilter: $('#typeFilter'), accountFilter: $('#accountFilter'), monthFilter: $('#monthFilter'),
      currencySelect: $('#currencySelect'), themeSelect: $('#themeSelect'), hideBalancesSetting: $('#hideBalancesSetting'), changePasswordForm: $('#changePasswordForm'),
      changeRecoveryForm: $('#changeRecoveryForm'), exportJsonButton: $('#exportJsonButton'), exportCsvButton: $('#exportCsvButton'), importJsonInput: $('#importJsonInput'), resetDataButton: $('#resetDataButton')
    });
  }

  function applyBranding() {
    document.title = `${config.APP_NAME || 'Finora'} by ${config.APP_OWNER || 'DesignLab'}`;
    $$('[data-app-name]').forEach((node) => node.textContent = config.APP_NAME || 'Finora');
    $$('[data-version]').forEach((node) => node.textContent = config.VERSION || '2.0.6');
    const usernameInput = $('input[name="username"]', els.loginForm);
    if (usernameInput && config.DEFAULT_USERNAME) usernameInput.value = config.DEFAULT_USERNAME;
  }

  function checkConfigStatus() {
    const missing = !config.SUPABASE_URL || config.SUPABASE_URL.includes('YOUR_PROJECT') || !config.SUPABASE_ANON_KEY || config.SUPABASE_ANON_KEY.includes('YOUR_SUPABASE');
    if (missing) {
      els.configStatus.textContent = 'Setup needed: add your Supabase URL and anon/publishable key in assets/js/config.js, then run supabase/finora_schema.sql.';
      els.configStatus.classList.add('warn');
    } else {
      els.configStatus.textContent = 'Supabase is configured. Login is ready once the SQL schema has been installed.';
    }
  }

  function initSupabase() {
    if (!window.supabase || !config.SUPABASE_URL || config.SUPABASE_URL.includes('YOUR_PROJECT')) return;
    supabaseClient = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
  }

  function bindEvents() {
    els.authTabs?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-auth]');
      if (!button) return;
      setAuthTab(button.dataset.auth);
    });

    els.loginForm?.addEventListener('submit', handleLogin);
    els.forgotForm?.addEventListener('submit', handleForgotPassword);
    els.logoutButton?.addEventListener('click', handleLogout);
    els.syncButton?.addEventListener('click', () => saveNow(true));

    els.sideNav?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-route]');
      if (button) setRoute(button.dataset.route);
    });
    document.body.addEventListener('click', (event) => {
      const go = event.target.closest('[data-go]');
      if (go) setRoute(go.dataset.go);
      const quick = event.target.closest('[data-quick-type]');
      if (quick) openTransactionModal({ type: quick.dataset.quickType });
      const doc = event.target.closest('[data-open-doc]');
      if (doc) openDocModal(doc.dataset.openDoc);
    });

    els.quickAddButton?.addEventListener('click', () => openTransactionModal({ type: 'expense' }));
    els.addTransactionButton?.addEventListener('click', () => openTransactionModal({ type: 'expense' }));
    els.addAccountButton?.addEventListener('click', () => openAccountModal());
    els.addBudgetButton?.addEventListener('click', () => openBudgetModal());
    els.addGoalButton?.addEventListener('click', () => openGoalModal());
    els.addRecurringButton?.addEventListener('click', () => openRecurringModal());
    els.addReminderButton?.addEventListener('click', () => openReminderModal());

    [els.toggleBalances, els.heroEyeButton].forEach((button) => button?.addEventListener('click', toggleBalanceVisibility));
    [els.transactionSearch, els.typeFilter, els.accountFilter, els.monthFilter].forEach((input) => input?.addEventListener('input', renderTransactions));

    els.currencySelect?.addEventListener('change', () => { state.meta.currency = els.currencySelect.value; markDirty(); renderAll(); });
    els.themeSelect?.addEventListener('change', () => { state.meta.theme = els.themeSelect.value; applyTheme(); markDirty(); });
    els.hideBalancesSetting?.addEventListener('change', () => { state.meta.hideBalances = els.hideBalancesSetting.checked; markDirty(); renderAll(); });
    els.changePasswordForm?.addEventListener('submit', handleChangePassword);
    els.changeRecoveryForm?.addEventListener('submit', handleChangeRecoveryCode);
    els.exportJsonButton?.addEventListener('click', exportJson);
    els.exportCsvButton?.addEventListener('click', exportCsv);
    els.importJsonInput?.addEventListener('change', importJson);
    els.resetDataButton?.addEventListener('click', resetFinanceData);

    window.addEventListener('beforeunload', (event) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    });
  }

  function setAuthTab(tabName) {
    $$('[data-auth]', els.authTabs).forEach((button) => button.classList.toggle('active', button.dataset.auth === tabName));
    $$('.auth-form').forEach((form) => form.classList.remove('active'));
    $(`#${tabName}Form`)?.classList.add('active');
  }

  function requireSupabase() {
    if (!supabaseClient) throw new Error('Supabase is not configured yet. Update assets/js/config.js first.');
    return supabaseClient;
  }

  async function handleLogin(event) {
    event.preventDefault();
    setNotice(els.loginNotice, 'Logging in…', 'info');
    const form = new FormData(event.currentTarget);
    try {
      const client = requireSupabase();
      const { data, error } = await client.rpc('finora_login', {
        p_username: String(form.get('username') || '').trim(),
        p_password: String(form.get('password') || ''),
        p_user_agent: navigator.userAgent
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.message || 'Unable to login.');
      sessionToken = data.token;
      currentUser = data.user;
      sessionStorage.setItem(storageKey('sessionToken'), sessionToken);
      sessionStorage.setItem(storageKey('currentUser'), JSON.stringify(currentUser));
      await loadRemoteState();
      toast('Welcome back to Finora.');
    } catch (error) {
      setNotice(els.loginNotice, error.message || 'Login failed.', 'error');
    }
  }

  async function handleForgotPassword(event) {
    event.preventDefault();
    setNotice(els.forgotNotice, 'Checking recovery code…', 'info');
    const form = new FormData(event.currentTarget);
    try {
      const client = requireSupabase();
      const { data, error } = await client.rpc('finora_reset_password_with_recovery', {
        p_username: String(form.get('username') || '').trim(),
        p_recovery_code: String(form.get('recoveryCode') || ''),
        p_new_password: String(form.get('newPassword') || '')
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.message || 'Password reset failed.');
      setNotice(els.forgotNotice, 'Password updated. You can login now.', 'success');
      event.currentTarget.reset();
      setAuthTab('login');
    } catch (error) {
      setNotice(els.forgotNotice, error.message || 'Password reset failed.', 'error');
    }
  }

  async function handleLogout() {
    try {
      if (supabaseClient && sessionToken) await supabaseClient.rpc('finora_logout', { p_session_token: sessionToken });
    } catch (error) { console.warn(error); }
    clearSession();
    showAuth();
  }

  async function loadRemoteState() {
    const client = requireSupabase();
    const { data, error } = await client.rpc('finora_get_state', { p_session_token: sessionToken });
    if (error) throw error;
    if (!data?.ok) throw new Error(data?.message || 'Unable to load Finora data.');
    currentUser = data.user || currentUser;
    state = normalizeState(data.state || defaultState());
    sessionStorage.setItem(storageKey('currentUser'), JSON.stringify(currentUser));
    dirty = false;
    showApp();
    renderAll();
  }

  async function saveNow(showToast = false) {
    if (!state || !sessionToken) return;
    els.saveState.textContent = 'Saving…';
    state.meta.updatedAt = nowISO();
    try {
      const { data, error } = await requireSupabase().rpc('finora_save_state', {
        p_session_token: sessionToken,
        p_state: state
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.message || 'Unable to save Finora data.');
      dirty = false;
      els.saveState.textContent = `Saved ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      if (showToast) toast('Finora data synced to Supabase.');
    } catch (error) {
      els.saveState.textContent = 'Save failed';
      toast(error.message || 'Save failed. Check Supabase setup.');
    }
  }

  function markDirty() {
    dirty = true;
    els.saveState.textContent = 'Unsaved changes…';
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => saveNow(false), 700);
  }

  function normalizeState(input) {
    const base = defaultState();
    const merged = {
      ...base,
      ...input,
      meta: { ...base.meta, ...(input.meta || {}) },
      accounts: Array.isArray(input.accounts) ? input.accounts : base.accounts,
      transactions: Array.isArray(input.transactions) ? input.transactions : [],
      budgets: Array.isArray(input.budgets) ? input.budgets : [],
      goals: Array.isArray(input.goals) ? input.goals : [],
      recurring: Array.isArray(input.recurring) ? input.recurring : [],
      reminders: Array.isArray(input.reminders) ? input.reminders : [],
      settings: { ...base.settings, ...(input.settings || {}) }
    };
    merged.accounts = merged.accounts.map((a) => ({ includeNetWorth: true, currency: merged.meta.currency || 'PHP', openingBalance: 0, ...a, openingBalance: Number(a.openingBalance || 0) }));
    merged.transactions = merged.transactions.map((t) => ({ ...t, amount: Number(t.amount || 0) }));
    merged.budgets = merged.budgets.map((b) => ({ active: true, ...b, limit: Number(b.limit || b.amount || 0) }));
    merged.goals = merged.goals.map((g) => ({ ...g, target: Number(g.target || 0), current: Number(g.current || 0) }));
    merged.recurring = merged.recurring.map((r) => ({ active: true, ...r, amount: Number(r.amount || 0) }));
    merged.reminders = merged.reminders.map((r) => ({ status: 'pending', ...r, amount: Number(r.amount || 0) }));
    return merged;
  }

  function showLoadingAuth(message) {
    showAuth();
    setNotice(els.loginNotice, message, 'info');
  }

  function showAuth() {
    els.authGate.hidden = false;
    els.appShell.hidden = true;
  }

  function showApp() {
    els.authGate.hidden = true;
    els.appShell.hidden = false;
    setNotice(els.loginNotice, '', 'info');
  }

  function clearLegacyPersistentSession() {
    localStorage.removeItem(storageKey('sessionToken'));
    localStorage.removeItem(storageKey('currentUser'));
  }

  function clearSession() {
    sessionToken = '';
    currentUser = null;
    state = null;
    dirty = false;
    sessionStorage.removeItem(storageKey('sessionToken'));
    sessionStorage.removeItem(storageKey('currentUser'));
    clearLegacyPersistentSession();
  }

  function setRoute(route) {
    activeRoute = route;
    $$('.nav-item').forEach((button) => button.classList.toggle('active', button.dataset.route === route));
    $$('.page').forEach((page) => page.classList.toggle('active', page.dataset.page === route));
    const labels = {
      dashboard: ['PERSONAL FINANCE', 'Overview'], transactions: ['TRANSACTION LEDGER', 'Transactions'], accounts: ['ACCOUNT CENTER', 'Accounts'],
      budget: ['BUDGET CONTROL', 'Budget'], goals: ['SAVINGS TARGETS', 'Goals'], recurring: ['AUTOMATION', 'Recurring'],
      insights: ['FINANCIAL SNAPSHOT', 'Insights'], settings: ['APP CONTROL', 'Settings']
    };
    els.pageEyebrow.textContent = labels[route]?.[0] || 'FINORA';
    els.pageTitle.textContent = labels[route]?.[1] || 'Finora';
    renderAll();
  }

  function renderAll() {
    if (!state) return;
    applyTheme();
    renderUser();
    renderDashboard();
    renderAccounts();
    renderTransactions();
    renderBudgets();
    renderGoals();
    renderRecurring();
    renderInsights();
    renderSettings();
  }

  function restoreTheme() {
    document.documentElement.dataset.theme = 'light';
  }

  function applyTheme() {
    const theme = state?.meta?.theme || 'system';
    const resolved = theme === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme;
    document.documentElement.dataset.theme = resolved;
  }

  function renderUser() {
    els.currentUserName.textContent = currentUser?.display_name || currentUser?.username || 'jaravata';
    els.currentUserRole.textContent = currentUser?.username ? `@${currentUser.username}` : 'Personal account';
    els.currentUserAvatar.textContent = (currentUser?.display_name || currentUser?.username || 'J').slice(0, 1).toUpperCase();
  }

  function renderDashboard() {
    const summary = getSummary();
    $('#netWorthValue').textContent = money(summary.netWorth);
    $('#monthIncome').textContent = money(summary.monthIncome);
    $('#monthExpense').textContent = money(summary.monthExpense);
    $('#monthNet').textContent = money(summary.monthIncome - summary.monthExpense);
    $('#netWorthAccountCount').textContent = `${state.accounts.filter((a) => a.includeNetWorth !== false).length} active accounts`;
    $('#netWorthTrend').textContent = summary.transactionCount ? `${summary.transactionCount} total transaction${summary.transactionCount === 1 ? '' : 's'}` : 'All starting values are ₱0.00';

    const dashboardAccounts = $('#dashboardAccounts');
    dashboardAccounts.innerHTML = state.accounts.map((account) => accountMiniCard(account)).join('') || empty('No accounts yet. Add your first account.');

    const recent = [...state.transactions].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 5);
    $('#recentTransactions').innerHTML = recent.map(transactionRow).join('') || empty('No transactions yet. Start with an income, expense, or transfer.');

    $('#dashboardGoals').innerHTML = state.goals.slice(0, 4).map(goalCardCompact).join('') || empty('No savings goals yet.');
  }

  function renderAccounts() {
    const grid = $('#accountsGrid');
    grid.innerHTML = state.accounts.map((account) => `
      <article class="mini-card account-card">
        <div class="mini-top"><span class="emoji">${escapeHtml(account.emoji || '💼')}</span><span class="tag">${escapeHtml(account.type || 'account')}</span></div>
        <div><h4>${escapeHtml(account.name)}</h4><p>${escapeHtml(account.institution || 'No institution set')}</p></div>
        <strong class="money-display small-money">${money(getAccountBalance(account.id))}</strong>
        <div class="button-row"><button class="secondary-button" type="button" data-edit-account="${account.id}">Edit</button><button class="ghost-button" type="button" data-delete-account="${account.id}">Delete</button></div>
      </article>`).join('') || empty('No accounts yet.');

    $$('[data-edit-account]', grid).forEach((btn) => btn.addEventListener('click', () => openAccountModal(state.accounts.find((a) => a.id === btn.dataset.editAccount))));
    $$('[data-delete-account]', grid).forEach((btn) => btn.addEventListener('click', () => deleteAccount(btn.dataset.deleteAccount)));
    refreshAccountFilters();
  }

  function renderTransactions() {
    const tbody = $('#transactionsTable');
    const q = String(els.transactionSearch?.value || '').toLowerCase();
    const type = els.typeFilter?.value || 'all';
    const account = els.accountFilter?.value || 'all';
    const month = els.monthFilter?.value || '';
    const rows = [...state.transactions]
      .filter((t) => type === 'all' || t.type === type)
      .filter((t) => account === 'all' || t.accountId === account || t.toAccountId === account)
      .filter((t) => !month || String(t.date || '').startsWith(month))
      .filter((t) => !q || [t.notes, t.category, t.merchant, accountName(t.accountId), accountName(t.toAccountId)].join(' ').toLowerCase().includes(q))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.createdAt).localeCompare(String(a.createdAt)));

    tbody.innerHTML = rows.map((t) => `
      <tr>
        <td>${formatDate(t.date)}</td>
        <td><strong>${escapeHtml(t.category || titleCase(t.type))}</strong><br><small>${escapeHtml(t.merchant || t.notes || 'No notes')}</small></td>
        <td>${escapeHtml(accountName(t.accountId))}${t.type === 'transfer' ? ` → ${escapeHtml(accountName(t.toAccountId))}` : ''}</td>
        <td><span class="tag ${t.type}">${escapeHtml(t.type)}</span></td>
        <td><strong class="money ${t.type}">${t.type === 'expense' ? '−' : t.type === 'income' ? '+' : ''}${money(t.amount)}</strong></td>
        <td><button class="text-button" type="button" data-edit-transaction="${t.id}">Edit</button><button class="text-button" type="button" data-delete-transaction="${t.id}">Delete</button></td>
      </tr>`).join('') || `<tr><td colspan="6">${empty('No matching transactions.')}</td></tr>`;

    $$('[data-edit-transaction]', tbody).forEach((btn) => btn.addEventListener('click', () => openTransactionModal(state.transactions.find((t) => t.id === btn.dataset.editTransaction))));
    $$('[data-delete-transaction]', tbody).forEach((btn) => btn.addEventListener('click', () => deleteTransaction(btn.dataset.deleteTransaction)));
  }

  function renderBudgets() {
    const grid = $('#budgetGrid');
    grid.innerHTML = state.budgets.map((budget) => {
      const spent = budgetSpent(budget);
      const limit = Number(budget.limit || 0);
      const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
      const over = spent > limit && limit > 0;
      return `<article class="mini-card budget-card">
        <div class="mini-top"><div><h4>${escapeHtml(budget.name)}</h4><p>${escapeHtml(budget.category || 'Overall spending')} • ${escapeHtml(budget.period || 'monthly')}</p></div><span class="tag ${over ? 'expense' : ''}">${over ? 'Over' : 'Active'}</span></div>
        <div class="progress ${over ? 'over' : ''}"><span style="width:${pct}%"></span></div>
        <p><strong>${money(spent)}</strong> used of <strong>${money(limit)}</strong></p>
        <p>Remaining: <strong>${money(Math.max(0, limit - spent))}</strong></p>
        <div class="button-row"><button class="secondary-button" type="button" data-edit-budget="${budget.id}">Edit</button><button class="ghost-button" type="button" data-delete-budget="${budget.id}">Delete</button></div>
      </article>`;
    }).join('') || empty('No budgets yet. Add daily, weekly, monthly, or yearly limits.');
    $$('[data-edit-budget]', grid).forEach((btn) => btn.addEventListener('click', () => openBudgetModal(state.budgets.find((b) => b.id === btn.dataset.editBudget))));
    $$('[data-delete-budget]', grid).forEach((btn) => btn.addEventListener('click', () => deleteById('budgets', btn.dataset.deleteBudget)));
  }

  function renderGoals() {
    const grid = $('#goalGrid');
    grid.innerHTML = state.goals.map((goal) => {
      const target = Number(goal.target || 0);
      const current = Number(goal.current || 0);
      const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
      return `<article class="mini-card goal-card">
        <div class="mini-top"><div><h4>${escapeHtml(goal.name)}</h4><p>${goal.targetDate ? `Target: ${formatDate(goal.targetDate)}` : 'No target date'}</p></div><span class="emoji">🎯</span></div>
        <div class="progress"><span style="width:${pct}%"></span></div>
        <p><strong>${money(current)}</strong> saved of <strong>${money(target)}</strong></p>
        <div class="button-row"><button class="secondary-button" type="button" data-contribute-goal="${goal.id}">Add contribution</button><button class="secondary-button" type="button" data-edit-goal="${goal.id}">Edit</button><button class="ghost-button" type="button" data-delete-goal="${goal.id}">Delete</button></div>
      </article>`;
    }).join('') || empty('No goals yet. Add a savings target.');
    $$('[data-edit-goal]', grid).forEach((btn) => btn.addEventListener('click', () => openGoalModal(state.goals.find((g) => g.id === btn.dataset.editGoal))));
    $$('[data-contribute-goal]', grid).forEach((btn) => btn.addEventListener('click', () => openGoalContribution(btn.dataset.contributeGoal)));
    $$('[data-delete-goal]', grid).forEach((btn) => btn.addEventListener('click', () => deleteById('goals', btn.dataset.deleteGoal)));
  }

  function renderRecurring() {
    const list = $('#recurringList');
    list.innerHTML = state.recurring.map((r) => `<article class="list-row">
      <span class="emoji">${r.type === 'income' ? '💰' : r.type === 'transfer' ? '🔁' : '🧾'}</span>
      <div><h4>${escapeHtml(r.name || r.category || titleCase(r.type))}</h4><p>${escapeHtml(r.frequency || 'monthly')} • next ${formatDate(r.nextDate)} • ${escapeHtml(accountName(r.accountId))}${r.type === 'transfer' ? ` → ${escapeHtml(accountName(r.toAccountId))}` : ''}</p></div>
      <div class="row-right"><strong>${money(r.amount)}</strong><br><button class="text-button" type="button" data-edit-recurring="${r.id}">Edit</button><button class="text-button" type="button" data-run-recurring="${r.id}">Post now</button><button class="text-button" type="button" data-delete-recurring="${r.id}">Delete</button></div>
    </article>`).join('') || empty('No recurring items yet.');
    $$('[data-edit-recurring]', list).forEach((btn) => btn.addEventListener('click', () => openRecurringModal(state.recurring.find((r) => r.id === btn.dataset.editRecurring))));
    $$('[data-run-recurring]', list).forEach((btn) => btn.addEventListener('click', () => postRecurring(btn.dataset.runRecurring)));
    $$('[data-delete-recurring]', list).forEach((btn) => btn.addEventListener('click', () => deleteById('recurring', btn.dataset.deleteRecurring)));
  }

  function renderInsights() {
    const ranges = { today: [todayISO(), todayISO()], month: currentPeriodRange('monthly'), year: currentPeriodRange('yearly') };
    const todaySummary = cashflowInRange(ranges.today[0], ranges.today[1]);
    const monthSummary = cashflowInRange(ranges.month[0], ranges.month[1]);
    const yearSummary = cashflowInRange(ranges.year[0], ranges.year[1]);
    $('#todayNet').textContent = money(todaySummary.income - todaySummary.expense);
    $('#todayDetails').textContent = `${money(todaySummary.income)} in • ${money(todaySummary.expense)} out`;
    $('#insightMonthNet').textContent = money(monthSummary.income - monthSummary.expense);
    $('#insightMonthDetails').textContent = `${money(monthSummary.income)} in • ${money(monthSummary.expense)} out`;
    $('#yearNet').textContent = money(yearSummary.income - yearSummary.expense);
    $('#yearDetails').textContent = `${money(yearSummary.income)} in • ${money(yearSummary.expense)} out`;
    renderCategoryCanvas();
    renderReminders();
  }

  function renderReminders() {
    const reminders = [...state.reminders, ...accountDueReminders()].sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate))).slice(0, 10);
    const list = $('#reminderList');
    list.innerHTML = reminders.map((r) => `<article class="list-row">
      <span class="emoji">${r.kind === 'loan' ? '📄' : r.kind === 'card' ? '💳' : '⏰'}</span>
      <div><h4>${escapeHtml(r.title)}</h4><p>${formatDate(r.dueDate)}${r.accountId ? ` • ${escapeHtml(accountName(r.accountId))}` : ''}</p></div>
      <div class="row-right"><strong>${money(r.amount || 0)}</strong>${r.source === 'account' ? '' : `<br><button class="text-button" type="button" data-edit-reminder="${r.id}">Edit</button><button class="text-button" type="button" data-delete-reminder="${r.id}">Delete</button>`}</div>
    </article>`).join('') || empty('No reminders yet. Add due dates for cards, loans, and bills.');
    $$('[data-edit-reminder]', list).forEach((btn) => btn.addEventListener('click', () => openReminderModal(state.reminders.find((r) => r.id === btn.dataset.editReminder))));
    $$('[data-delete-reminder]', list).forEach((btn) => btn.addEventListener('click', () => deleteById('reminders', btn.dataset.deleteReminder)));
  }

  function renderSettings() {
    els.currencySelect.value = state.meta.currency || 'PHP';
    els.themeSelect.value = state.meta.theme || 'system';
    els.hideBalancesSetting.checked = !!state.meta.hideBalances;
  }

  function refreshAccountFilters() {
    const options = `<option value="all">All accounts</option>` + state.accounts.map((a) => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('');
    if (els.accountFilter) {
      const current = els.accountFilter.value;
      els.accountFilter.innerHTML = options;
      els.accountFilter.value = current || 'all';
    }
  }

  function getSummary() {
    const month = new Date().toISOString().slice(0, 7);
    const monthTx = state.transactions.filter((t) => String(t.date || '').startsWith(month));
    return {
      netWorth: state.accounts.filter((a) => a.includeNetWorth !== false).reduce((sum, a) => sum + getAccountBalance(a.id), 0),
      monthIncome: monthTx.filter((t) => t.type === 'income').reduce((sum, t) => sum + Number(t.amount || 0), 0),
      monthExpense: monthTx.filter((t) => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount || 0), 0),
      transactionCount: state.transactions.length
    };
  }

  function getAccountBalance(accountId) {
    const account = state.accounts.find((a) => a.id === accountId);
    let balance = Number(account?.openingBalance || 0);
    for (const t of state.transactions) {
      const amount = Number(t.amount || 0);
      if (t.type === 'income' && t.accountId === accountId) balance += amount;
      if (t.type === 'expense' && t.accountId === accountId) balance -= amount;
      if (t.type === 'transfer') {
        if (t.accountId === accountId) balance -= amount;
        if (t.toAccountId === accountId) balance += amount;
      }
    }
    return balance;
  }

  function accountName(accountId) {
    return state.accounts.find((a) => a.id === accountId)?.name || 'No account';
  }

  function accountMiniCard(account) {
    return `<article class="mini-card"><div class="mini-top"><span class="emoji">${escapeHtml(account.emoji || '💼')}</span><span class="tag">${escapeHtml(account.type || 'account')}</span></div><div><h4>${escapeHtml(account.name)}</h4><p>${escapeHtml(account.institution || 'Personal')}</p></div><strong>${money(getAccountBalance(account.id))}</strong></article>`;
  }

  function transactionRow(t) {
    return `<article class="list-row"><span class="emoji">${t.type === 'income' ? '💰' : t.type === 'transfer' ? '🔁' : '🧾'}</span><div><h4>${escapeHtml(t.category || titleCase(t.type))}</h4><p>${formatDate(t.date)} • ${escapeHtml(accountName(t.accountId))}${t.type === 'transfer' ? ` → ${escapeHtml(accountName(t.toAccountId))}` : ''}</p></div><div class="row-right"><strong class="money ${t.type}">${t.type === 'expense' ? '−' : t.type === 'income' ? '+' : ''}${money(t.amount)}</strong></div></article>`;
  }

  function goalCardCompact(goal) {
    const target = Number(goal.target || 0);
    const current = Number(goal.current || 0);
    const pct = target ? Math.min(100, current / target * 100) : 0;
    return `<article class="mini-card"><div class="mini-top"><h4>${escapeHtml(goal.name)}</h4><span class="tag">${Math.round(pct)}%</span></div><div class="progress"><span style="width:${pct}%"></span></div><p>${money(current)} of ${money(target)}</p></article>`;
  }

  function budgetSpent(budget) {
    const [start, end] = currentPeriodRange(budget.period || 'monthly', budget.startDate);
    return state.transactions
      .filter((t) => t.type === 'expense')
      .filter((t) => t.date >= start && t.date <= end)
      .filter((t) => !budget.category || budget.category === 'All' || String(t.category || '').toLowerCase() === String(budget.category).toLowerCase())
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }

  function currentPeriodRange(period) {
    const date = new Date();
    const y = date.getFullYear();
    const m = date.getMonth();
    if (period === 'daily') return [todayISO(), todayISO()];
    if (period === 'weekly') {
      const d = new Date(date);
      const day = d.getDay() || 7;
      d.setDate(d.getDate() - day + 1);
      const start = d.toISOString().slice(0, 10);
      d.setDate(d.getDate() + 6);
      return [start, d.toISOString().slice(0, 10)];
    }
    if (period === 'yearly') return [`${y}-01-01`, `${y}-12-31`];
    return [`${y}-${String(m + 1).padStart(2, '0')}-01`, new Date(y, m + 1, 0).toISOString().slice(0, 10)];
  }

  function cashflowInRange(start, end) {
    return state.transactions.filter((t) => t.date >= start && t.date <= end).reduce((acc, t) => {
      if (t.type === 'income') acc.income += Number(t.amount || 0);
      if (t.type === 'expense') acc.expense += Number(t.amount || 0);
      return acc;
    }, { income: 0, expense: 0 });
  }

  function accountDueReminders() {
    return state.accounts.filter((a) => a.dueDate && ['credit', 'loan'].includes(a.type)).map((a) => ({
      id: `account_${a.id}`, source: 'account', title: `${a.name} due date`, kind: a.type === 'credit' ? 'card' : 'loan', dueDate: nextDueDate(a.dueDate), amount: Math.abs(getAccountBalance(a.id)), accountId: a.id
    }));
  }

  function nextDueDate(dayValue) {
    const day = Math.max(1, Math.min(28, Number(dayValue || 1)));
    const date = new Date();
    let due = new Date(date.getFullYear(), date.getMonth(), day);
    if (due < new Date(todayISO())) due = new Date(date.getFullYear(), date.getMonth() + 1, day);
    return due.toISOString().slice(0, 10);
  }

  function renderCategoryCanvas() {
    const canvas = $('#categoryCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const byCategory = {};
    const month = new Date().toISOString().slice(0, 7);
    state.transactions.filter((t) => t.type === 'expense' && String(t.date || '').startsWith(month)).forEach((t) => {
      const cat = t.category || 'Uncategorized';
      byCategory[cat] = (byCategory[cat] || 0) + Number(t.amount || 0);
    });
    const entries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((sum, [, value]) => sum + value, 0);
    ctx.font = '700 16px Inter, sans-serif';
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--muted');
    if (!entries.length) {
      ctx.textAlign = 'center';
      ctx.fillText('No monthly expenses to chart yet.', canvas.width / 2, canvas.height / 2);
      return;
    }
    let start = -Math.PI / 2;
    const colors = ['#2557ff', '#20c8ff', '#7b61ff', '#3142ff', '#8aa8ff', '#e5484d', '#0c9f6e'];
    entries.forEach(([cat, amount], index) => {
      const angle = (amount / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(140, 140); ctx.arc(140, 140, 92, start, start + angle); ctx.closePath();
      ctx.fillStyle = colors[index % colors.length]; ctx.fill();
      start += angle;
    });
    ctx.beginPath(); ctx.arc(140, 140, 52, 0, Math.PI * 2); ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--card'); ctx.fill();
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--ink'); ctx.textAlign = 'center'; ctx.font = '900 18px Inter, sans-serif'; ctx.fillText(money(total), 140, 146);
    ctx.textAlign = 'left'; ctx.font = '700 13px Inter, sans-serif';
    entries.slice(0, 7).forEach(([cat, amount], index) => {
      const y = 72 + index * 26;
      ctx.fillStyle = colors[index % colors.length]; ctx.fillRect(280, y - 11, 14, 14);
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--ink'); ctx.fillText(`${cat} — ${money(amount)}`, 304, y);
    });
  }

  function openAccountModal(account = null) {
    const editing = !!account;
    const data = account || { id: id(), name: '', type: 'wallet', institution: '', currency: state.meta.currency, openingBalance: 0, emoji: '💵', color: '#2557ff', includeNetWorth: true, dueDate: '', notes: '' };
    openModal(`${editing ? 'Edit' : 'Add'} account`, `<form id="accountForm" class="form-grid">
      <label>Name<input name="name" required value="${attr(data.name)}" placeholder="Cash, BPI, Maya, Credit Card…"></label>
      <label>Type<select name="type">${options(['wallet','bank','savings','credit','loan','investment','asset'], data.type)}</select></label>
      <label>Institution<input name="institution" value="${attr(data.institution)}" placeholder="Optional"></label>
      <label>Opening balance<input name="openingBalance" type="number" step="0.01" value="${Number(data.openingBalance || 0)}"></label>
      <label>Emoji<input name="emoji" value="${attr(data.emoji || '💵')}"></label>
      <label>Due day for card/loan<input name="dueDate" type="number" min="1" max="28" value="${attr(data.dueDate)}" placeholder="Example: 15"></label>
      <label class="toggle-row span"><input name="includeNetWorth" type="checkbox" ${data.includeNetWorth !== false ? 'checked' : ''}><span>Include in net worth</span></label>
      <label class="span">Notes<textarea name="notes">${escapeHtml(data.notes || '')}</textarea></label>
      <div class="button-row span"><button class="primary-button" type="submit">Save account</button><button class="ghost-button" type="button" data-close-modal>Cancel</button></div>
    </form>`);
    $('#accountForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const next = { ...data, name: form.get('name'), type: form.get('type'), institution: form.get('institution'), openingBalance: Number(form.get('openingBalance') || 0), emoji: form.get('emoji') || '💼', dueDate: form.get('dueDate') || '', includeNetWorth: !!form.get('includeNetWorth'), notes: form.get('notes'), updatedAt: nowISO(), createdAt: data.createdAt || nowISO() };
      upsert('accounts', next);
      closeModal(); renderAll(); markDirty(); toast('Account saved.');
    });
  }

  function openTransactionModal(transaction = {}) {
    const editing = !!transaction.id;
    const data = { id: id(), type: 'expense', accountId: state.accounts[0]?.id || '', toAccountId: state.accounts[1]?.id || '', amount: 0, category: '', date: todayISO(), merchant: '', notes: '', ...transaction };
    openModal(`${editing ? 'Edit' : 'Add'} transaction`, `<form id="transactionForm" class="form-grid">
      <label>Type<select name="type" id="txType">${options(['expense','income','transfer'], data.type)}</select></label>
      <label>Amount<input name="amount" type="number" step="0.01" min="0" required value="${Number(data.amount || 0)}"></label>
      <label>Account<select name="accountId" required>${accountOptions(data.accountId)}</select></label>
      <label class="to-account-field">To account<select name="toAccountId">${accountOptions(data.toAccountId)}</select></label>
      <label>Date<input name="date" type="date" required value="${attr(data.date || todayISO())}"></label>
      <label>Category<input name="category" value="${attr(data.category)}" placeholder="Food, Salary, Utilities…"></label>
      <label>Merchant / Source<input name="merchant" value="${attr(data.merchant)}" placeholder="Optional"></label>
      <label class="span">Notes<textarea name="notes">${escapeHtml(data.notes || '')}</textarea></label>
      <div class="button-row span"><button class="primary-button" type="submit">Save transaction</button><button class="ghost-button" type="button" data-close-modal>Cancel</button></div>
    </form>`);
    const txType = $('#txType');
    const toggleTo = () => $('.to-account-field').classList.toggle('hidden', txType.value !== 'transfer');
    txType.addEventListener('change', toggleTo); toggleTo();
    $('#transactionForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const next = { ...data, type: form.get('type'), amount: Number(form.get('amount') || 0), accountId: form.get('accountId'), toAccountId: form.get('toAccountId') || '', date: form.get('date'), category: form.get('category'), merchant: form.get('merchant'), notes: form.get('notes'), updatedAt: nowISO(), createdAt: data.createdAt || nowISO() };
      if (next.type !== 'transfer') next.toAccountId = '';
      upsert('transactions', next); closeModal(); renderAll(); markDirty(); toast('Transaction saved.');
    });
  }

  function openBudgetModal(budget = null) {
    const editing = !!budget;
    const data = budget || { id: id(), name: '', category: '', period: 'monthly', limit: 0, active: true };
    openModal(`${editing ? 'Edit' : 'Add'} budget`, `<form id="budgetForm" class="form-grid">
      <label>Name<input name="name" required value="${attr(data.name)}" placeholder="Monthly spending"></label>
      <label>Limit<input name="limit" type="number" step="0.01" min="0" required value="${Number(data.limit || 0)}"></label>
      <label>Category<input name="category" value="${attr(data.category)}" placeholder="Leave blank for overall"></label>
      <label>Period<select name="period">${options(['daily','weekly','monthly','yearly'], data.period)}</select></label>
      <label class="toggle-row span"><input name="active" type="checkbox" ${data.active !== false ? 'checked' : ''}><span>Active budget</span></label>
      <div class="button-row span"><button class="primary-button" type="submit">Save budget</button><button class="ghost-button" type="button" data-close-modal>Cancel</button></div>
    </form>`);
    $('#budgetForm').addEventListener('submit', (event) => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      upsert('budgets', { ...data, name: form.get('name'), limit: Number(form.get('limit') || 0), category: form.get('category'), period: form.get('period'), active: !!form.get('active'), updatedAt: nowISO(), createdAt: data.createdAt || nowISO() });
      closeModal(); renderAll(); markDirty(); toast('Budget saved.');
    });
  }

  function openGoalModal(goal = null) {
    const editing = !!goal;
    const data = goal || { id: id(), name: '', target: 0, current: 0, targetDate: '', accountId: state.accounts[0]?.id || '', notes: '' };
    openModal(`${editing ? 'Edit' : 'Add'} goal`, `<form id="goalForm" class="form-grid">
      <label>Name<input name="name" required value="${attr(data.name)}" placeholder="Emergency fund"></label>
      <label>Target amount<input name="target" type="number" step="0.01" min="0" required value="${Number(data.target || 0)}"></label>
      <label>Current saved<input name="current" type="number" step="0.01" min="0" value="${Number(data.current || 0)}"></label>
      <label>Target date<input name="targetDate" type="date" value="${attr(data.targetDate)}"></label>
      <label class="span">Linked account<select name="accountId">${accountOptions(data.accountId)}</select></label>
      <label class="span">Notes<textarea name="notes">${escapeHtml(data.notes || '')}</textarea></label>
      <div class="button-row span"><button class="primary-button" type="submit">Save goal</button><button class="ghost-button" type="button" data-close-modal>Cancel</button></div>
    </form>`);
    $('#goalForm').addEventListener('submit', (event) => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      upsert('goals', { ...data, name: form.get('name'), target: Number(form.get('target') || 0), current: Number(form.get('current') || 0), targetDate: form.get('targetDate'), accountId: form.get('accountId'), notes: form.get('notes'), updatedAt: nowISO(), createdAt: data.createdAt || nowISO() });
      closeModal(); renderAll(); markDirty(); toast('Goal saved.');
    });
  }

  function openGoalContribution(goalId) {
    const goal = state.goals.find((g) => g.id === goalId);
    if (!goal) return;
    openModal('Add contribution', `<form id="contributionForm" class="form-grid"><label class="span">Amount<input name="amount" type="number" step="0.01" min="0" required value="0"></label><div class="button-row span"><button class="primary-button" type="submit">Add contribution</button><button class="ghost-button" type="button" data-close-modal>Cancel</button></div></form>`);
    $('#contributionForm').addEventListener('submit', (event) => {
      event.preventDefault(); goal.current = Number(goal.current || 0) + Number(new FormData(event.currentTarget).get('amount') || 0);
      goal.updatedAt = nowISO(); closeModal(); renderAll(); markDirty(); toast('Contribution added.');
    });
  }

  function openRecurringModal(recurring = null) {
    const editing = !!recurring;
    const data = recurring || { id: id(), name: '', type: 'expense', accountId: state.accounts[0]?.id || '', toAccountId: '', amount: 0, category: '', frequency: 'monthly', nextDate: todayISO(), active: true, notes: '' };
    openModal(`${editing ? 'Edit' : 'Add'} recurring`, `<form id="recurringForm" class="form-grid">
      <label>Name<input name="name" required value="${attr(data.name)}" placeholder="Salary, Internet bill…"></label>
      <label>Type<select name="type" id="recType">${options(['expense','income','transfer'], data.type)}</select></label>
      <label>Amount<input name="amount" type="number" step="0.01" min="0" required value="${Number(data.amount || 0)}"></label>
      <label>Frequency<select name="frequency">${options(['daily','weekly','monthly','yearly'], data.frequency)}</select></label>
      <label>Account<select name="accountId" required>${accountOptions(data.accountId)}</select></label>
      <label class="rec-to-field">To account<select name="toAccountId">${accountOptions(data.toAccountId)}</select></label>
      <label>Next date<input name="nextDate" type="date" required value="${attr(data.nextDate || todayISO())}"></label>
      <label>Category<input name="category" value="${attr(data.category)}"></label>
      <label class="toggle-row span"><input name="active" type="checkbox" ${data.active !== false ? 'checked' : ''}><span>Active recurring item</span></label>
      <label class="span">Notes<textarea name="notes">${escapeHtml(data.notes || '')}</textarea></label>
      <div class="button-row span"><button class="primary-button" type="submit">Save recurring</button><button class="ghost-button" type="button" data-close-modal>Cancel</button></div>
    </form>`);
    const recType = $('#recType'); const toggleTo = () => $('.rec-to-field').classList.toggle('hidden', recType.value !== 'transfer');
    recType.addEventListener('change', toggleTo); toggleTo();
    $('#recurringForm').addEventListener('submit', (event) => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      const next = { ...data, name: form.get('name'), type: form.get('type'), amount: Number(form.get('amount') || 0), frequency: form.get('frequency'), accountId: form.get('accountId'), toAccountId: form.get('toAccountId') || '', nextDate: form.get('nextDate'), category: form.get('category'), active: !!form.get('active'), notes: form.get('notes'), updatedAt: nowISO(), createdAt: data.createdAt || nowISO() };
      if (next.type !== 'transfer') next.toAccountId = '';
      upsert('recurring', next); closeModal(); renderAll(); markDirty(); toast('Recurring item saved.');
    });
  }

  function openReminderModal(reminder = null) {
    const editing = !!reminder;
    const data = reminder || { id: id(), title: '', kind: 'bill', amount: 0, dueDate: todayISO(), accountId: '', notes: '', status: 'pending' };
    openModal(`${editing ? 'Edit' : 'Add'} reminder`, `<form id="reminderForm" class="form-grid">
      <label>Title<input name="title" required value="${attr(data.title)}" placeholder="Insurance, card payment…"></label>
      <label>Kind<select name="kind">${options(['bill','card','loan','subscription','other'], data.kind)}</select></label>
      <label>Amount<input name="amount" type="number" step="0.01" min="0" value="${Number(data.amount || 0)}"></label>
      <label>Due date<input name="dueDate" type="date" required value="${attr(data.dueDate || todayISO())}"></label>
      <label class="span">Linked account<select name="accountId"><option value="">No linked account</option>${accountOptions(data.accountId, false)}</select></label>
      <label class="span">Notes<textarea name="notes">${escapeHtml(data.notes || '')}</textarea></label>
      <div class="button-row span"><button class="primary-button" type="submit">Save reminder</button><button class="ghost-button" type="button" data-close-modal>Cancel</button></div>
    </form>`);
    $('#reminderForm').addEventListener('submit', (event) => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      upsert('reminders', { ...data, title: form.get('title'), kind: form.get('kind'), amount: Number(form.get('amount') || 0), dueDate: form.get('dueDate'), accountId: form.get('accountId'), notes: form.get('notes'), updatedAt: nowISO(), createdAt: data.createdAt || nowISO() });
      closeModal(); renderAll(); markDirty(); toast('Reminder saved.');
    });
  }

  function postRecurring(recurringId) {
    const r = state.recurring.find((item) => item.id === recurringId);
    if (!r) return;
    const t = { id: id(), type: r.type, accountId: r.accountId, toAccountId: r.toAccountId || '', amount: Number(r.amount || 0), category: r.category || r.name, merchant: 'Recurring', notes: r.notes || `Posted from recurring: ${r.name}`, date: todayISO(), recurringId: r.id, createdAt: nowISO(), updatedAt: nowISO() };
    state.transactions.push(t);
    r.nextDate = advanceDate(r.nextDate || todayISO(), r.frequency || 'monthly');
    r.updatedAt = nowISO();
    renderAll(); markDirty(); toast('Recurring item posted.');
  }

  function advanceDate(dateISO, frequency) {
    const d = new Date(dateISO);
    if (frequency === 'daily') d.setDate(d.getDate() + 1);
    else if (frequency === 'weekly') d.setDate(d.getDate() + 7);
    else if (frequency === 'yearly') d.setFullYear(d.getFullYear() + 1);
    else d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  }

  function deleteAccount(accountId) {
    const hasTx = state.transactions.some((t) => t.accountId === accountId || t.toAccountId === accountId);
    if (hasTx) return toast('This account has transactions. Delete or move them first.');
    if (!confirm('Delete this account?')) return;
    state.accounts = state.accounts.filter((a) => a.id !== accountId);
    renderAll(); markDirty(); toast('Account deleted.');
  }

  function deleteTransaction(txId) {
    if (!confirm('Delete this transaction?')) return;
    state.transactions = state.transactions.filter((t) => t.id !== txId);
    renderAll(); markDirty(); toast('Transaction deleted.');
  }

  function deleteById(collection, itemId) {
    if (!confirm('Delete this item?')) return;
    state[collection] = state[collection].filter((item) => item.id !== itemId);
    renderAll(); markDirty(); toast('Item deleted.');
  }

  function upsert(collection, record) {
    const index = state[collection].findIndex((item) => item.id === record.id);
    if (index >= 0) state[collection][index] = record;
    else state[collection].push(record);
  }

  async function handleChangePassword(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const { data, error } = await requireSupabase().rpc('finora_change_password', {
        p_session_token: sessionToken,
        p_current_password: String(form.get('currentPassword') || ''),
        p_new_password: String(form.get('newPassword') || '')
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.message || 'Password change failed.');
      event.currentTarget.reset(); toast('Password changed.');
    } catch (error) { toast(error.message || 'Password change failed.'); }
  }

  async function handleChangeRecoveryCode(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const { data, error } = await requireSupabase().rpc('finora_update_recovery_code', {
        p_session_token: sessionToken,
        p_current_password: String(form.get('currentPassword') || ''),
        p_new_recovery_code: String(form.get('newRecoveryCode') || '')
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.message || 'Recovery code update failed.');
      event.currentTarget.reset(); toast('Recovery code updated.');
    } catch (error) { toast(error.message || 'Recovery code update failed.'); }
  }

  async function resetFinanceData() {
    if (!confirm('Reset all finance data to ₱0.00? Export a backup first.')) return;
    try {
      const { data, error } = await requireSupabase().rpc('finora_reset_app_data', { p_session_token: sessionToken });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.message || 'Reset failed.');
      state = normalizeState(data.state || defaultState());
      dirty = false; renderAll(); toast('Finance data reset to zero.');
    } catch (error) { toast(error.message || 'Reset failed.'); }
  }

  function exportJson() {
    downloadFile(`finora-backup-${todayISO()}.json`, JSON.stringify({ exportedAt: nowISO(), app: config.APP_NAME, version: config.VERSION, state }, null, 2), 'application/json');
  }

  function exportCsv() {
    const headers = ['date','type','account','to_account','category','merchant','notes','amount'];
    const rows = state.transactions.map((t) => [t.date, t.type, accountName(t.accountId), accountName(t.toAccountId), t.category, t.merchant, t.notes, t.amount]);
    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
    downloadFile(`finora-transactions-${todayISO()}.csv`, csv, 'text/csv');
  }

  async function importJson(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const content = await file.text();
      const parsed = JSON.parse(content);
      const incoming = parsed.state || parsed;
      if (!incoming.accounts || !incoming.transactions) throw new Error('Invalid Finora backup.');
      if (!confirm('Import this backup and replace current finance data?')) return;
      state = normalizeState(incoming);
      renderAll(); markDirty(); toast('Backup imported. Syncing now…');
      await saveNow(false);
    } catch (error) { toast(error.message || 'Import failed.'); }
    event.target.value = '';
  }

  function openDocModal(kind) {
    const docs = {
      privacy: ['Privacy Notice', `<div class="legal-copy"><p>Finora Supabase Edition is prepared for personal or in-house use. It stores account login records, session records, audit logs, and your finance app data in your own Supabase project.</p><h3>Data processed</h3><p>Username, password hash, recovery-code hash, session token hashes, audit events, accounts, transactions, budgets, goals, recurring items, reminders, app settings, and backups you export.</p><h3>Purpose</h3><p>Data is used to authenticate you, sync your finance records, display summaries, and support backup or reset actions.</p><h3>Control</h3><p>You control the Supabase project, database, app deployment, and backups. Use strong project access controls and do not publish the service role key.</p></div>`],
      terms: ['Terms of Use', `<div class="legal-copy"><p>Finora is provided as a personal finance tracker and planning tool by DesignLab. It is not financial, accounting, tax, or legal advice.</p><p>Review all figures before making financial decisions. You are responsible for protecting your login credentials, backups, and Supabase project access.</p></div>`],
      security: ['Security Notes', `<div class="legal-copy"><p>This edition uses Supabase RPC functions, password hashing through Postgres pgcrypto, hashed session tokens, failed-login lockout, owner recovery code, and no direct table access through the public client.</p><p>Before any public launch, migrate to Supabase Auth or a dedicated backend, configure production monitoring, and complete a proper privacy/legal review.</p></div>`]
    };
    openModal(docs[kind]?.[0] || 'Document', docs[kind]?.[1] || '');
  }

  function openModal(title, body) {
    els.modalRoot.innerHTML = `<div class="modal-backdrop" role="dialog" aria-modal="true"><div class="modal"><div class="modal-head"><h2>${escapeHtml(title)}</h2><button class="close-button" type="button" data-close-modal>×</button></div>${body}</div></div>`;
    els.modalRoot.addEventListener('click', closeModalHandler);
  }

  function closeModalHandler(event) {
    if (event.target.matches('.modal-backdrop') || event.target.closest('[data-close-modal]')) closeModal();
  }

  function closeModal() {
    els.modalRoot.removeEventListener('click', closeModalHandler);
    els.modalRoot.innerHTML = '';
  }

  function toggleBalanceVisibility() {
    state.meta.hideBalances = !state.meta.hideBalances;
    renderAll(); markDirty();
  }

  function money(value) {
    if (state?.meta?.hideBalances) return '••••••';
    const currency = state?.meta?.currency || config.DEFAULT_CURRENCY || 'PHP';
    const locale = state?.meta?.locale || config.DEFAULT_LOCALE || 'en-PH';
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value || 0));
  }

  function formatDate(dateValue) {
    if (!dateValue) return 'No date';
    const date = new Date(`${dateValue}T00:00:00`);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function empty(message) { return `<div class="empty-state">${escapeHtml(message)}</div>`; }
  function titleCase(value) { return String(value || '').replace(/[-_]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()); }
  function escapeHtml(value) { return String(value ?? '').replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m])); }
  function attr(value) { return escapeHtml(value || ''); }
  function options(list, selected) { return list.map((item) => `<option value="${item}" ${item === selected ? 'selected' : ''}>${titleCase(item)}</option>`).join(''); }
  function accountOptions(selected, includeEmpty = true) { return (includeEmpty && !state.accounts.length ? '<option value="">No accounts yet</option>' : '') + state.accounts.map((a) => `<option value="${a.id}" ${a.id === selected ? 'selected' : ''}>${escapeHtml(a.name)}</option>`).join(''); }
  function csvEscape(value) { const s = String(value ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
  function downloadFile(filename, content, type) { const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); }
  function setNotice(node, message, type = 'info') { if (!node) return; node.innerHTML = message ? `<div class="notice ${type}">${escapeHtml(message)}</div>` : ''; }
  function toast(message) { els.toast.textContent = message; els.toast.hidden = false; window.clearTimeout(els.toast._timer); els.toast._timer = window.setTimeout(() => { els.toast.hidden = true; }, 3200); }

  document.addEventListener('DOMContentLoaded', init);
})();
