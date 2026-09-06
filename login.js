// =============================================================
//  UTILITY FUNCTIONS
// =============================================================

/**
 * Hash a password using SHA-256 (Web Crypto API)
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hex-encoded hash
 */
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Toggle password visibility for an input field
 * @param {string} inputId - ID of the input element
 * @param {HTMLElement} button - The toggle button element
 */
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

/**
 * Switch between Login and Register tabs
 * @param {string} tab - 'login' or 'register'
 */
function switchTab(tab) {
    const loginSection = document.getElementById('loginSection');
    const registerSection = document.getElementById('registerSection');
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');

    // Hide all sections
    document.querySelectorAll('.form-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

    if (tab === 'login') {
        loginSection.classList.add('active');
        tabLogin.classList.add('active');
        document.getElementById('loginUsername').focus();
    } else {
        registerSection.classList.add('active');
        tabRegister.classList.add('active');
        document.getElementById('regUsername').focus();
    }
    clearMessages();
}

/**
 * Clear all error and success messages
 */
function clearMessages() {
    ['loginError', 'loginSuccess', 'registerError', 'registerSuccess'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '';
    });
}

// =============================================================
//  USER DATABASE MANAGEMENT
// =============================================================

const DB_KEY = 'academicTracker_users';

/**
 * Get users stored in localStorage
 * @returns {Array} Array of user objects
 */
function getLocalUsers() {
    const stored = localStorage.getItem(DB_KEY);
    return stored ? JSON.parse(stored) : [];
}

/**
 * Save users to localStorage
 * @param {Array} users - Array of user objects
 */
function saveLocalUsers(users) {
    localStorage.setItem(DB_KEY, JSON.stringify(users));
}

/**
 * Fetch static users from users.json file
 * @returns {Promise<Array>} Array of user objects
 */
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

/**
 * Merge static and local users (local overrides static)
 * @returns {Promise<Array>} Merged array of user objects
 */
async function getMergedUsers() {
    const staticUsers = await fetchStaticUsers();
    const localUsers = getLocalUsers();
    const userMap = new Map();
    // Add static users
    staticUsers.forEach(u => userMap.set(u.username.toLowerCase(), u));
    // Add local users (overrides static if same username)
    localUsers.forEach(u => userMap.set(u.username.toLowerCase(), u));
    return Array.from(userMap.values());
}

/**
 * Add a new user (saved to localStorage only)
 * @param {string} username - Username
 * @param {string} password - Plain text password (will be hashed)
 * @param {string} hint - Optional password hint
 * @returns {Promise<boolean>} True if successful
 * @throws {Error} If username already exists
 */
async function addUser(username, password, hint) {
    const users = getLocalUsers();
    // Check local users
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        throw new Error('Username already exists locally.');
    }
    // Check merged (including static) to prevent duplicates
    const merged = await getMergedUsers();
    if (merged.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        throw new Error('Username already exists (including static users).');
    }
    const hashed = await hashPassword(password);
    users.push({
        username: username,
        passwordHash: hashed,
        hint: hint || ''
    });
    saveLocalUsers(users);
    return true;
}

/**
 * Validate login credentials against merged user list
 * @param {string} username - Username
 * @param {string} password - Plain text password
 * @returns {Promise<Object|null>} User object with username and hint, or null if invalid
 */
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
    // --- LOGIN FORM ---
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    const loginBtnText = document.getElementById('loginBtnText');
    const loginError = document.getElementById('loginError');
    const loginSuccess = document.getElementById('loginSuccess');
    const loginLoading = document.getElementById('loginLoading');
    const loginHint = document.getElementById('loginHint');

    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            clearMessages();
            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value.trim();

            if (!username || !password) {
                loginError.textContent = 'Please fill in both fields.';
                return;
            }

            // Show loading state
            loginBtn.disabled = true;
            loginBtnText.textContent = 'Checking…';
            loginLoading.style.display = 'block';

            try {
                const result = await validateUser(username, password);
                if (result) {
                    // Success
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
                    // Invalid credentials – show hint if user exists
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
                console.error('Login error:', err);
                loginError.textContent = '❌ An error occurred. Please try again.';
                loginLoading.style.display = 'none';
                loginBtn.disabled = false;
                loginBtnText.textContent = 'Login';
            }
        });
    }

    // Show hint when username field loses focus
    const loginUsername = document.getElementById('loginUsername');
    if (loginUsername) {
        loginUsername.addEventListener('blur', async function() {
            const username = this.value.trim();
            if (!username) {
                loginHint.textContent = '';
                return;
            }
            const users = await getMergedUsers();
            const found = users.find(u => u.username.toLowerCase() === username.toLowerCase());
            if (found && found.hint) {
                loginHint.textContent = '💡 Hint: ' + found.hint;
            } else {
                loginHint.textContent = '';
            }
        });
    }

    // --- REGISTER FORM ---
    const registerForm = document.getElementById('registerForm');
    const registerBtn = document.getElementById('registerBtn');
    const registerBtnText = document.getElementById('registerBtnText');
    const registerError = document.getElementById('registerError');
    const registerSuccess = document.getElementById('registerSuccess');
    const registerLoading = document.getElementById('registerLoading');

    if (registerForm) {
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
                // Clear fields
                document.getElementById('regUsername').value = '';
                document.getElementById('regPassword').value = '';
                document.getElementById('regHint').value = '';
                // Switch to login tab after a moment
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
    }

    // --- PASSWORD STRENGTH CHECKER ---
    const regPassword = document.getElementById('regPassword');
    const strengthEl = document.getElementById('passwordStrength');

    if (regPassword && strengthEl) {
        regPassword.addEventListener('input', function() {
            const password = this.value;
            if (password.length === 0) {
                strengthEl.textContent = '';
                return;
            }

            let score = 0;
            if (password.length >= 8) score++;
            if (password.length >= 12) score++;
            if (/[a-z]/.test(password)) score++;
            if (/[A-Z]/.test(password)) score++;
            if (/[0-9]/.test(password)) score++;
            if (/[^a-zA-Z0-9]/.test(password)) score++;

            const labels = ['', 'Weak', 'Weak', 'Medium', 'Strong', 'Very Strong', 'Excellent'];
            const classes = ['', 'weak', 'weak', 'medium', 'strong', 'very-strong', 'very-strong'];
            const strength = Math.min(Math.floor(score / 1.5) + 1, 6);

            strengthEl.textContent = 'Strength: ' + (labels[strength] || '');
            strengthEl.className = 'password-strength ' + (classes[strength] || '');
        });
    }

    // --- PRE-FILL USERNAME (if already logged in) ---
    const lastUser = localStorage.getItem('currentUser');
    if (lastUser) {
        const loginUsernameInput = document.getElementById('loginUsername');
        if (loginUsernameInput) {
            loginUsernameInput.value = lastUser;
            document.getElementById('loginPassword').focus();
        }
    } else {
        const loginUsernameInput = document.getElementById('loginUsername');
        if (loginUsernameInput) loginUsernameInput.focus();
    }
});

// =============================================================
//  EXPOSE TO GLOBAL SCOPE (for inline onclick attributes)
// =============================================================

window.switchTab = switchTab;
window.togglePassword = togglePassword;
window.clearMessages = clearMessages;
window.hashPassword = hashPassword;
window.getMergedUsers = getMergedUsers;
window.validateUser = validateUser;
window.addUser = addUser;
