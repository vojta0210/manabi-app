// ==============================================
// AUTH — login/register/logout via Supabase Auth, plus afterAuth()/initApp() which
// bootstrap the session on page load. Depends on: config.js, state.js, data.js, ui-core.js.
// ==============================================

// --- Auth ---
// Real auth now: Supabase Auth checks the password server-side and Postgres Row Level
// Security policies (not this file) decide who can read/write what. The app only ever asks
// for a name, never a real email — emailFor() turns "name + role" into a stable synthetic
// address so Supabase Auth (which needs an email) has something unique to key off of.
async function login(role) {
  if (!state.loginName) return alert('Name required.');
  if (!state.loginPassword) return alert('Password required.');
  const email = emailFor(state.loginName, role);
  const { error } = await sb.auth.signInWithPassword({ email, password: state.loginPassword });
  if (error) {
    alert('Login failed — check the name, password and role.');
    return;
  }
  state.loginName = '';
  state.loginPassword = '';
  await afterAuth();
}

async function register(role) {
  if (!state.registerName) return alert('Name required');
  if (!state.registerPassword || state.registerPassword.length < 6) return alert('Password must be at least 6 characters');
  if (!state.registerRecovery || state.registerRecovery.trim().length < 4) return alert('Recovery phrase must be at least 4 characters — it\'s the only way to reset your password later, since there\'s no real email on the account.');
  if (role === 'student' && !state.registerSchoolClassId) return alert('Please select your class.');
  const email = emailFor(state.registerName, role);
  const { data, error } = await sb.auth.signUp({
    email,
    password: state.registerPassword,
    options: { data: {
      role,
      display_name: state.registerName,
      // Only meaningful for students — handle_new_user() in schema.sql reads this to set
      // profiles.school_class_id at signup time.
      school_class_id: role === 'student' ? String(state.registerSchoolClassId) : null,
    } }
  });
  if (error) {
    if ((error.message || '').toLowerCase().includes('already registered')) alert('That name is already taken. Try logging in instead.');
    else alert('Registration failed: ' + error.message);
    return;
  }
  // Supabase signs up a duplicate email "successfully" (to avoid leaking which emails
  // exist) but marks it with an empty identities array instead of returning an error.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    alert('That name is already taken. Try logging in instead.');
    return;
  }
  // Store the recovery phrase (hashed server-side, see set_recovery_secret() in schema.sql)
  // now while we still have a fresh session from signUp. Not fatal if it fails — the account
  // still works, the person just won't have self-service password recovery until they set
  // one from Settings.
  const { error: recErr } = await sb.rpc('set_recovery_secret', { p_secret: state.registerRecovery });
  if (recErr) console.error('Could not save recovery phrase:', recErr);
  state.registerName = '';
  state.registerPassword = '';
  state.registerRecovery = '';
  state.registerSchoolClassId = '';
  state.loginMode = '';
  await afterAuth();
}

// Self-service password reset for the email-free login system — see ForgotPasswordForm()
// in view-auth.js and reset_password_with_recovery() in schema.sql for the other two
// pieces of this flow.
async function resetPasswordWithRecovery(role) {
  const { name, recovery, newPassword } = state.forgotForm;
  if (!name) return alert('Enter your name.');
  if (!recovery) return alert('Enter your recovery phrase.');
  if (!newPassword || newPassword.length < 6) return alert('New password must be at least 6 characters.');
  const email = emailFor(name, role);
  const { data, error } = await sb.rpc('reset_password_with_recovery', {
    p_email: email, p_recovery: recovery, p_new_password: newPassword
  });
  if (error) { alert('Could not reset password: ' + error.message); return; }
  if (!data) { alert('Name, role or recovery phrase did not match.'); return; }
  alert('Password changed — you can log in now.');
  state.showForgotPassword = false;
  state.forgotForm = { name: '', recovery: '', newPassword: '' };
  render();
}

async function afterAuth() {
  state.authLoading = true;
  render();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) { state.authLoading = false; render(); return; }
  await fetchAllData();
  const me = [...state.students, ...state.teachers, ...state.principals].find(u => u.id === user.id);
  state.currentUser = me || {
    id: user.id,
    name: user.user_metadata?.display_name || 'User',
    role: user.user_metadata?.role || 'student',
    bio: '', birthDate: '', classroomIds: [],
  };
  state.authLoading = false;
  state.view = 'dashboard';
  subscribeRealtime();
  render();
}

async function logout() {
  unsubscribeRealtime();
  await sb.auth.signOut();
  state.currentUser = null;
  state.view = 'dashboard';
  render();
}

// ==============================================
// REALTIME — so a teacher grading a submission or a student turning one in shows up for
// the other person without a manual reload. One shared channel, listening for any change on
// the tables that matter; RLS still applies to what each connection actually receives, so
// this can't leak data the person couldn't already query themselves.
// ==============================================
let _realtimeChannel = null;
let _realtimeRefreshTimer = null;

function subscribeRealtime() {
  if (_realtimeChannel) return; // already subscribed this session
  const tables = ['classrooms', 'classroom_members', 'homework', 'homework_assignments', 'homework_files', 'student_files', 'grades', 'school_classes'];
  let channel = sb.channel('app-data-changes');
  tables.forEach(table => {
    channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, scheduleRealtimeRefresh);
  });
  _realtimeChannel = channel.subscribe();
}

function scheduleRealtimeRefresh() {
  // Several rows can change from one action (e.g. attaching a file assigns copies to 30
  // students at once), so debounce and refetch once instead of once per row.
  clearTimeout(_realtimeRefreshTimer);
  _realtimeRefreshTimer = setTimeout(async () => {
    if (!state.currentUser) return;
    if (state.view === 'editor') return; // don't yank content out from under someone mid-edit
    await fetchAllData();
    render();
  }, 400);
}

function unsubscribeRealtime() {
  clearTimeout(_realtimeRefreshTimer);
  if (_realtimeChannel) { sb.removeChannel(_realtimeChannel); _realtimeChannel = null; }
}

// ==============================================
// PRINCIPAL ENTRY — hidden, obscurity-not-security way in. Nothing in the UI links here;
// visiting script.html#reditelna (or the always-visible PrincipalCorner widget in
// view-auth.js) switches the login screen into principal mode.
// ==============================================
const PRINCIPAL_ENTRY_HASH = '#reditelna';

function tryEnterPrincipalMode() {
  if (window.location.hash === PRINCIPAL_ENTRY_HASH) {
    state.loginMode = 'principal';
  }
}
// Typing/pasting the hash onto an already-open tab doesn't trigger a reload in most
// browsers, so the one-time check in initApp() alone would miss it — this catches
// same-tab hash changes too (e.g. navigating here, then back here, without a refresh).
window.addEventListener('hashchange', () => { tryEnterPrincipalMode(); render(); });

async function initApp() {
  tryEnterPrincipalMode();
  // Loaded in parallel with the session check — the registration form's "which class am I
  // joining" dropdown needs this list before anyone is signed in.
  const [sessionRes] = await Promise.all([sb.auth.getSession(), loadSchoolClasses()]);
  const { data: { session } } = sessionRes;
  if (session) { await afterAuth(); return; }
  state.authLoading = false;
  render();
}
