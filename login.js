// =============================================================
//  UTILITY FUNCTIONS
// =============================================================

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function togglePassword(inputId, button) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const icon = button.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

function switchTab(tab) {
    console.log('switchTab called with:', tab);
    const loginSection = document.getElementById('loginSection');
    const registerSection = document.getElementById('registerSection');
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');

    document.querySelectorAll('.form-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

    if (tab === 'login') {
        loginSection.classList.add('active');
        tabLogin.classList.add('active');
    } else {
        registerSection.classList.add('active');
        tabRegister.classList.add('active');
    }
    clearMessages();
}

function clearMessages() {
    ['loginError', 'loginSuccess', 'registerError', 'registerSuccess'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '';
    });
}

// =============================================================
//  PASSWORD STRENGTH CHECKER
// =============================================================

function checkPasswordStrength(password) {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 1) return { label: 'Weak', class: 'weak', width: '25%' };
    if (score === 2) return { label: 'Fair', class: 'fair', width: '50%' };
    if (score === 3 || score === 4) return { label: 'Good', class: 'good', width: '75%' };
    if (score >= 5) return { label: 'Strong', class: 'strong', width: '100%' };
    return { label: '', class: '', width: '0%' };
}

// =============================================================
//  USER DATABASE MANAGEMENT
// =============================================================

const DB_KEY = 'academicTracker_users';

function getLocalUsers() {
    const stored = localStorage.getItem(DB_KEY);
    return stored ? JSON.parse(stored) : [];
}

function saveLocalUsers(users) {
    localStorage.setItem(DB_KEY, JSON.stringify(users));
}

async function fetchStaticUsers() {
    try {
        const response = await fetch('users.json');
        if (!response.ok) throw new Error('Failed to load users.json');
        return await response.json();
    } catch (err) {
        console.warn('Could not load static users.json:', err);
        return [];
    }
}

async function getMergedUsers() {
    const staticUsers = await fetchStaticUsers();
    const localUsers = getLocalUsers();
    const userMap = new Map();
    staticUsers.forEach(u => userMap.set(u.username.toLowerCase(), u));
    localUsers.forEach(u => userMap.set(u.username.toLowerCase(), u));
    return Array.from(userMap.values());
}

async function addUser(username, password, hint) {
    const users = getLocalUsers();
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        throw new Error('Username already exists locally.');
    }
    const merged = await getMergedUsers();
    if (merged.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        throw new Error('Username already exists (including static users).');
    }
    const hashed = await hashPassword(password);
    users.push({ username, passwordHash: hashed, hint: hint || '' });
    saveLocalUsers(users);
    return true;
}

async function validateUser(username, password) {
    const users = await getMergedUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) return null;
    const hashed = await hashPassword(password);
    if (hashed === user.passwordHash) {
        return { username: user.username, hint: user.hint || '' };
    }
    return null;
}

// =============================================================
//  UI HANDLERS
// =============================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded – script running');

    // ---- Tab switching with delegation ----
    const tabBar = document.querySelector('.tab-bar');
    if (!tabBar) {
        console.error('Tab bar not found!');
        return;
    }

    tabBar.addEventListener('click', function(e) {
        const tabBtn = e.target.closest('.tab-btn');
        if (!tabBtn) return;
        console.log('Tab clicked:', tabBtn.id);
        const tab = tabBtn.id === 'tabLogin' ? 'login' : 'register';
        switchTab(tab);
    });

    // ---- Toggle password (delegated) ----
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            if (targetId) togglePassword(targetId, this);
        });
    });

    // ---- Login form ----
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    const loginBtnText = document.getElementById('loginBtnText');
    const loginError = document.getElementById('loginError');
    const loginSuccess = document.getElementById('loginSuccess');
    const loginLoading = document.getElementById('loginLoading');
    const loginHint = document.getElementById('loginHint');

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        clearMessages();
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value.trim();
        if (!username || !password) {
            loginError.textContent = 'Please fill in both fields.';
            return;
        }
        loginBtn.disabled = true;
        loginBtnText.textContent = 'Checking…';
        loginLoading.style.display = 'block';

        try {
            const result = await validateUser(username, password);
            if (result) {
                loginSuccess.textContent = '✅ Login successful! Redirecting…';
                loginLoading.style.display = 'none';
                localStorage.setItem('currentUser', result.username);
                if (result.hint) {
                    loginHint.textContent = '💡 Hint: ' + result.hint;
                }
                setTimeout(() => {
                    window.location.href = 'app.html';
                }, 800);
            } else {
                const users = await getMergedUsers();
                const found = users.find(u => u.username.toLowerCase() === username.toLowerCase());
                if (found) {
                    if (found.hint) {
                        loginHint.textContent = '💡 Hint: ' + found.hint;
                    } else {
                        loginHint.textContent = 'No hint provided for this user.';
                    }
                    loginError.textContent = '❌ Incorrect password.';
                } else {
                    loginHint.textContent = '';
                    loginError.textContent = '❌ Username not found.';
                }
                loginLoading.style.display = 'none';
                loginBtn.disabled = false;
                loginBtnText.textContent = 'Login';
            }
        } catch (err) {
            console.error(err);
            loginError.textContent = '❌ An error occurred. Please try again.';
            loginLoading.style.display = 'none';
            loginBtn.disabled = false;
            loginBtnText.textContent = 'Login';
        }
    });

    // Show hint on username blur
    document.getElementById('loginUsername').addEventListener('blur', async function() {
        const username = this.value.trim();
        if (!username) { loginHint.textContent = ''; return; }
        const users = await getMergedUsers();
        const found = users.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (found && found.hint) {
            loginHint.textContent = '💡 Hint: ' + found.hint;
        } else {
            loginHint.textContent = '';
        }
    });

    // ---- Register form ----
    const registerForm = document.getElementById('registerForm');
    const registerBtn = document.getElementById('registerBtn');
    const registerBtnText = document.getElementById('registerBtnText');
    const registerError = document.getElementById('registerError');
    const registerSuccess = document.getElementById('registerSuccess');
    const registerLoading = document.getElementById('registerLoading');

    // Password strength live update
    const regPassword = document.getElementById('regPassword');
    const strengthBar = document.getElementById('strengthBar');
    const strengthText = document.getElementById('strengthText');

    regPassword.addEventListener('input', function() {
        const password = this.value;
        if (password.length === 0) {
            strengthBar.className = 'strength-bar';
            strengthBar.style.width = '0%';
            strengthText.textContent = '';
            return;
        }
        const result = checkPasswordStrength(password);
        strengthBar.className = 'strength-bar ' + result.class;
        strengthBar.style.width = result.width;
        strengthText.textContent = 'Strength: ' + result.label;
    });

    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        clearMessages();
        const username = document.getElementById('regUsername').value.trim();
        const password = document.getElementById('regPassword').value.trim();
        const hint = document.getElementById('regHint').value.trim();
        if (!username || !password) {
            registerError.textContent = 'Please fill in both fields.';
            return;
        }
        if (password.length < 4) {
            registerError.textContent = 'Password must be at least 4 characters.';
            return;
        }
        registerBtn.disabled = true;
        registerBtnText.textContent = 'Creating…';
        registerLoading.style.display = 'block';

        try {
            await addUser(username, password, hint);
            registerSuccess.textContent = '✅ Account created! You can now log in.';
            registerLoading.style.display = 'none';
            registerBtn.disabled = false;
            registerBtnText.textContent = 'Create Account';
            document.getElementById('regUsername').value = '';
            document.getElementById('regPassword').value = '';
            document.getElementById('regHint').value = '';
            // Reset strength meter
            strengthBar.className = 'strength-bar';
            strengthBar.style.width = '0%';
            strengthText.textContent = '';
            setTimeout(() => {
                switchTab('login');
                document.getElementById('loginUsername').value = username;
                document.getElementById('loginPassword').focus();
            }, 1500);
        } catch (err) {
            registerError.textContent = '❌ ' + err.message;
            registerLoading.style.display = 'none';
            registerBtn.disabled = false;
            registerBtnText.textContent = 'Create Account';
        }
    });

    // ---- Pre‑fill last user ----
    const lastUser = localStorage.getItem('currentUser');
    if (lastUser) {
        document.getElementById('loginUsername').value = lastUser;
        document.getElementById('loginPassword').focus();
    } else {
        document.getElementById('loginUsername').focus();
    }

    // ---- Help link ----
    const helpLink = document.querySelector('.footer-help');
    if (helpLink) {
        helpLink.addEventListener('click', function(e) {
            e.preventDefault();
            alert('Contact your administrator for help.');
        });
    }

    console.log('All event listeners attached.');
});

// Expose functions globally if needed
window.togglePassword = togglePassword;
window.switchTab = switchTab;
