// ==============================================
// VIEW: AUTH SCREEN — the logged-out login/register screen.
// Depends on: state.js, ui-core.js, auth.js.
// ==============================================

// --- Auth Screen ---
function AuthScreen() {
  const isRegister = state.loginMode.startsWith('register');
  const cardContent = [
    el('div', { className: 'text-center mb-10' },
      el('div', { className: 'flex flex-col items-center justify-center mb-8' },
        el('img', { src: 'logo_manaby.jpg', alt: 'Logo', className: 'w-full h-auto' })
      ),
      el('p', { className: 'text-gray-600 font-medium text-lg' }, isRegister ? 'Create Account' : 'Welcome Back')
    )
  ];

  if (!state.loginMode) {
    cardContent.push(
      el('div', { className: 'grid gap-4' },
        el('button', { className: 'p-5 rounded-none bg-black text-white hover:bg-gray-800 transition font-bold text-lg border-2 border-black', onClick: () => { state.loginMode = 'teacher'; render(); } }, 'Login as Teacher'),
        el('button', { className: 'p-5 rounded-none bg-white text-black hover:bg-gray-50 transition font-bold text-lg border-2 border-black', onClick: () => { state.loginMode = 'student'; render(); } }, 'Login as Student'),
        el('div', { className: 'text-center text-gray-500 text-sm font-bold my-4 tracking-widest uppercase' }, '— Or Register —'),
        el('div', { className: 'grid grid-cols-2 gap-4' },
          el('button', { className: 'p-3 rounded-none bg-gray-100 hover:bg-gray-200 text-black text-sm font-bold border-2 border-gray-300', onClick: () => { state.loginMode = 'register-teacher'; render(); } }, 'New Teacher'),
          el('button', { className: 'p-3 rounded-none bg-gray-100 hover:bg-gray-200 text-black text-sm font-bold border-2 border-gray-300', onClick: () => { state.loginMode = 'register-student'; render(); } }, 'New Student')
        )
      )
    );
  } else if (state.showForgotPassword) {
    const role = state.loginMode.includes('teacher') ? 'teacher' : state.loginMode.includes('principal') ? 'principal' : 'student';
    cardContent.push(ForgotPasswordForm(role));
  } else {
    const role = state.loginMode.includes('teacher') ? 'teacher' : state.loginMode.includes('principal') ? 'principal' : 'student';
    const isReg = state.loginMode.includes('register');
    cardContent.push(
      el('div', { className: 'space-y-6' },
        el('div', {},
          el('label', { className: 'block text-sm font-extrabold text-black uppercase tracking-wider mb-2' }, 'Full Name'),
          el('input', {
            className: 'w-full p-4 rounded-none border-2 border-gray-200 focus:border-black font-bold text-lg text-black outline-none',
            placeholder: isReg ? 'e.g. Jane Doe' : 'Enter Name',
            value: isReg ? state.registerName : state.loginName,
            onInput: (e) => isReg ? state.registerName = e.target.value : state.loginName = e.target.value
          })
        ),
        el('div', {},
          el('label', { className: 'block text-sm font-extrabold text-black uppercase tracking-wider mb-2' }, 'Password'),
          el('input', {
            type: 'password',
            className: 'w-full p-4 rounded-none border-2 border-gray-200 focus:border-black font-bold text-lg text-black outline-none',
            placeholder: isReg ? 'At least 6 characters' : 'Enter Password',
            value: isReg ? state.registerPassword : state.loginPassword,
            onInput: (e) => isReg ? state.registerPassword = e.target.value : state.loginPassword = e.target.value,
            onKeyDown: (e) => { if (e.key === 'Enter') isReg ? register(role) : login(role); }
          })
        ),
        isReg ? el('div', {},
          el('label', { className: 'block text-sm font-extrabold text-black uppercase tracking-wider mb-2' }, 'Recovery Phrase'),
          el('input', {
            className: 'w-full p-4 rounded-none border-2 border-gray-200 focus:border-black font-bold text-lg text-black outline-none',
            placeholder: 'A secret only you know — used to reset your password',
            value: state.registerRecovery,
            onInput: (e) => state.registerRecovery = e.target.value
          }),
          el('p', { className: 'text-xs text-gray-400 mt-2' }, "There's no real email on this account, so this phrase is the only way back in if you forget your password. Write it down somewhere.")
        ) : null,
        isReg && role === 'student' ? el('div', {},
          el('label', { className: 'block text-sm font-extrabold text-black uppercase tracking-wider mb-2' }, 'Class'),
          el('select', {
            className: 'w-full p-4 rounded-none border-2 border-gray-200 focus:border-black font-bold text-lg text-black outline-none bg-white',
            onInput: (e) => { state.registerSchoolClassId = e.target.value; }
          },
            el('option', { value: '' }, state.schoolClasses.length ? 'Select your class…' : 'No classes set up yet'),
            ...state.schoolClasses.map(sc => {
              const opt = el('option', { value: sc.id }, sc.name);
              if (String(sc.id) === String(state.registerSchoolClassId)) opt.selected = true;
              return opt;
            })
          )
        ) : null,
        el('button', {
          className: 'w-full p-4 rounded-none font-bold text-lg bg-black text-white hover:bg-gray-800 border-2 border-black transition',
          onClick: () => isReg ? register(role) : login(role)
        }, isReg ? 'Create Account' : 'Login'),
        !isReg ? el('button', {
          className: 'w-full text-gray-500 hover:text-black text-xs font-bold py-1 underline',
          onClick: () => { state.showForgotPassword = true; state.forgotForm = { name: state.loginName, recovery: '', newPassword: '' }; render(); }
        }, 'Forgot password?') : null,
        role === 'principal' ? el('button', {
          className: 'w-full text-gray-500 hover:text-black text-xs font-bold py-1 underline',
          onClick: () => { state.loginMode = isReg ? 'principal' : 'register-principal'; render(); }
        }, isReg ? 'Already have an account? Login' : 'Register instead') : null,
        el('button', {
          className: 'w-full text-gray-500 hover:text-black text-sm font-bold py-2 underline',
          onClick: () => { state.loginMode = ''; state.loginPassword = ''; state.registerPassword = ''; state.registerRecovery = ''; state.registerSchoolClassId = ''; render(); }
        }, 'Cancel & Go Back')
      )
    );
  }

  return el('div', { className: 'flex items-center justify-center min-h-screen p-4 bg-gray-100' },
    el('div', { className: 'w-full max-w-lg bg-white shadow-xl p-10 rounded-none' }, ...cardContent),
    PrincipalCorner()
  );
}

// ==============================================
// PRINCIPAL CORNER — the quiet, always-present way into the principal role. No label, no
// hint in the normal UI; just a faint dot bottom-right. This is obscurity, not security —
// RLS (is_principal() in schema.sql) is what actually protects the data, this just keeps
// the login button off the screen for the other 99% of people who open the app.
// ==============================================
function PrincipalCorner() {
  if (!state.principalCornerOpen) {
    return el('button', {
      className: 'fixed bottom-3 left-3 w-2.5 h-2.5 rounded-full bg-gray-200 hover:bg-gray-400 transition opacity-40 hover:opacity-100 z-50',
      onClick: () => { state.principalCornerOpen = true; render(); }
    });
  }
  const isReg = state.principalCornerReg;
  return el('div', { className: 'fixed bottom-3 left-3 w-64 bg-white border-2 border-black shadow-xl p-4 z-50 space-y-3' },
    el('div', { className: 'flex items-center justify-between' },
      el('p', { className: 'text-[10px] font-bold text-gray-400 uppercase tracking-widest' }, isReg ? 'Principal — Register' : 'Principal'),
      el('button', { className: 'text-gray-300 hover:text-black text-xs', onClick: () => { state.principalCornerOpen = false; render(); } }, '✕')
    ),
    el('input', {
      className: 'w-full p-2 border-2 border-gray-200 focus:border-black text-sm font-bold text-black outline-none',
      placeholder: 'Name',
      value: state.principalCornerName,
      onInput: (e) => { state.principalCornerName = e.target.value; }
    }),
    el('input', {
      type: 'password',
      className: 'w-full p-2 border-2 border-gray-200 focus:border-black text-sm font-bold text-black outline-none',
      placeholder: 'Password',
      value: state.principalCornerPassword,
      onInput: (e) => { state.principalCornerPassword = e.target.value; },
      onKeyDown: (e) => { if (e.key === 'Enter') principalCornerSubmit(); }
    }),
    isReg ? el('input', {
      className: 'w-full p-2 border-2 border-gray-200 focus:border-black text-sm font-bold text-black outline-none',
      placeholder: 'Recovery phrase',
      value: state.registerRecovery,
      onInput: (e) => { state.registerRecovery = e.target.value; }
    }) : null,
    el('button', {
      className: 'w-full p-2 text-xs font-bold uppercase tracking-wider bg-black text-white hover:bg-gray-800 transition',
      onClick: principalCornerSubmit
    }, isReg ? 'Register' : 'Login'),
    el('button', {
      className: 'w-full text-center text-[10px] text-gray-300 hover:text-black underline',
      onClick: () => { state.principalCornerReg = !state.principalCornerReg; render(); }
    }, isReg ? 'Already have an account? Login' : 'Register instead')
  );
}

function principalCornerSubmit() {
  state.loginName = state.principalCornerName;
  state.loginPassword = state.principalCornerPassword;
  if (state.principalCornerReg) {
    state.registerName = state.principalCornerName;
    state.registerPassword = state.principalCornerPassword;
    register('principal');
  } else {
    login('principal');
  }
}

// Self-service reset for the email-free login system: proves identity with the recovery
// phrase set at registration instead of an email link (see reset_password_with_recovery()
// in schema.sql — verification and the actual password change both happen server-side).
function ForgotPasswordForm(role) {
  const form = state.forgotForm;
  return el('div', { className: 'space-y-6' },
    el('p', { className: 'text-sm text-gray-500 -mt-2' }, `Resetting a ${role} password. Enter your name, your recovery phrase, and a new password.`),
    el('div', {},
      el('label', { className: 'block text-sm font-extrabold text-black uppercase tracking-wider mb-2' }, 'Full Name'),
      el('input', {
        className: 'w-full p-4 rounded-none border-2 border-gray-200 focus:border-black font-bold text-lg text-black outline-none',
        placeholder: 'Enter Name',
        value: form.name,
        onInput: (e) => form.name = e.target.value
      })
    ),
    el('div', {},
      el('label', { className: 'block text-sm font-extrabold text-black uppercase tracking-wider mb-2' }, 'Recovery Phrase'),
      el('input', {
        className: 'w-full p-4 rounded-none border-2 border-gray-200 focus:border-black font-bold text-lg text-black outline-none',
        placeholder: 'The phrase you set when you registered',
        value: form.recovery,
        onInput: (e) => form.recovery = e.target.value
      })
    ),
    el('div', {},
      el('label', { className: 'block text-sm font-extrabold text-black uppercase tracking-wider mb-2' }, 'New Password'),
      el('input', {
        type: 'password',
        className: 'w-full p-4 rounded-none border-2 border-gray-200 focus:border-black font-bold text-lg text-black outline-none',
        placeholder: 'At least 6 characters',
        value: form.newPassword,
        onInput: (e) => form.newPassword = e.target.value,
        onKeyDown: (e) => { if (e.key === 'Enter') resetPasswordWithRecovery(role); }
      })
    ),
    el('button', {
      className: 'w-full p-4 rounded-none font-bold text-lg bg-black text-white hover:bg-gray-800 border-2 border-black transition',
      onClick: () => resetPasswordWithRecovery(role)
    }, 'Reset Password'),
    el('button', {
      className: 'w-full text-gray-500 hover:text-black text-sm font-bold py-2 underline',
      onClick: () => { state.showForgotPassword = false; render(); }
    }, 'Cancel & Go Back')
  );
}
