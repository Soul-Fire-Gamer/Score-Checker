// =============================================================
//  APP ROUTER & COMMON DATA
// =============================================================

const pageMap = {
    dashboard: { html: 'pages/dashboard.html', js: 'pages/dashboard.js', css: 'pages/dashboard.css' },
    subjects:  { html: 'pages/subjects.html',  js: 'pages/subjects.js',  css: 'pages/subjects.css' },
    calendar:  { html: 'pages/calendar.html',  js: 'pages/calendar.js',  css: 'pages/calendar.css' },
    notes:     { html: 'pages/notes.html',     js: 'pages/notes.js',     css: 'pages/notes.css' },
    profile:   { html: 'pages/profile.html',   js: 'pages/profile.js',   css: 'pages/profile.css' }
};

let currentPage = 'dashboard';
let currentUser = null;

// =============================================================
//  USER REGISTRY (compatible with login.js array format)
// =============================================================

const DB_KEY = 'academicTracker_users';

/**
 * Returns users as an object keyed by username:
 *   { sfg: { username:'sfg', passwordHash:'...', hint:'...', profilePic:'...' }, ... }
 * Internally converts login.js's array format on read.
 */
function getUsers() {
    const stored = localStorage.getItem(DB_KEY);
    if (!stored) return {};
    try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
            const map = {};
            parsed.forEach(u => {
                if (u && u.username) map[u.username] = u;
            });
            return map;
        }
        return parsed;
    } catch (e) {
        console.warn('Could not parse users; resetting.', e);
        return {};
    }
}

/**
 * Persists the user map back to localStorage in the ARRAY format
 * that login.js expects, so both files stay compatible.
 */
function saveUsers(usersObj) {
    const arr = Object.values(usersObj);
    localStorage.setItem(DB_KEY, JSON.stringify(arr));
}

// Default avatar (embedded SVG so no external file needed)
const DEFAULT_AVATAR = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">' +
    '<rect width="120" height="120" fill="#e0e7ff"/>' +
    '<circle cx="60" cy="46" r="22" fill="#6366f1"/>' +
    '<path d="M20 120c0-22 18-40 40-40s40 18 40 40z" fill="#6366f1"/>' +
    '</svg>'
);

/**
 * Applies the current user's profile picture (or the default) to
 * every avatar placeholder in the app shell: sidebar + header + page.
 */
function applyProfilePictures() {
    if (!currentUser) return;
    const users = getUsers();
    const record = users[currentUser] || {};
    const src = record.profilePic || DEFAULT_AVATAR;

    ['sidebarProfilePic', 'headerProfilePic', 'profilePagePic'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.src = src;
    });
}

// =============================================================
//  AUTH
// =============================================================
function checkAuth() {
    currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
        window.location.href = 'login.html';
        return false;
    }
    const headerEl = document.getElementById('headerUsername');
    const sideEl = document.getElementById('sidebarUsername');
    if (headerEl) headerEl.textContent = currentUser;
    if (sideEl) sideEl.textContent = currentUser;
    applyProfilePictures();
    return true;
}

// =============================================================
//  PAGE LOADING
// =============================================================
async function loadPage(page) {
    if (!pageMap[page]) return;

    document.querySelectorAll('.nav-item, .bottom-nav .nav-icon').forEach(el => {
        el.classList.toggle('active', el.dataset.page === page);
    });
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = page.charAt(0).toUpperCase() + page.slice(1);
    currentPage = page;

    const container = document.getElementById('pageContainer');
    const pageInfo = pageMap[page];

    const cssId = 'page-css-' + page;
    if (!document.getElementById(cssId)) {
        const link = document.createElement('link');
        link.id = cssId;
        link.rel = 'stylesheet';
        link.href = pageInfo.css;
        document.head.appendChild(link);
    }

    try {
        const response = await fetch(pageInfo.html);
        if (!response.ok) throw new Error('Page not found');
        const html = await response.text();
        container.innerHTML = html;
    } catch (err) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Could not load page.</p></div>`;
        console.error(err);
    }

    // Re-apply avatars after new HTML has been injected
    applyProfilePictures();

    const scriptId = 'page-js-' + page;
    if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = pageInfo.js;
        script.onload = function () {
            document.dispatchEvent(new CustomEvent('pageLoaded', {
                detail: { page, user: currentUser }
            }));
        };
        document.body.appendChild(script);
    } else {
        document.dispatchEvent(new CustomEvent('pageLoaded', {
            detail: { page, user: currentUser }
        }));
    }
}

// =============================================================
//  NAVIGATION
// =============================================================
function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

function navigateTo(page) {
    if (page === currentPage) {
        loadPage(page);
        return;
    }
    loadPage(page);
    closeSidebar();
}

function toggleSidebar() {
    document.getElementById('sidebar')?.classList.toggle('open');
    document.getElementById('sidebarOverlay')?.classList.toggle('active');
}
function closeSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebarOverlay')?.classList.remove('active');
}

// =============================================================
//  INIT
// =============================================================
document.addEventListener('DOMContentLoaded', function () {
    if (!checkAuth()) return;

    loadPage('dashboard');

    document.querySelectorAll('.nav-item[data-page], .bottom-nav .nav-icon[data-page]').forEach(el => {
        el.addEventListener('click', function () {
            navigateTo(this.dataset.page);
        });
    });

    document.getElementById('menuToggle')?.addEventListener('click', toggleSidebar);
    document.getElementById('sidebarOverlay')?.addEventListener('click', closeSidebar);

    // Logout buttons (replaces inline onclick)
    document.getElementById('headerLogoutBtn')?.addEventListener('click', logout);
    document.getElementById('sidebarLogoutBtn')?.addEventListener('click', logout);

    document.addEventListener('pageLoaded', function (e) {
        const page = e.detail.page;
        const user = e.detail.user;
        if (typeof window.initPage === 'function') {
            window.initPage(page, user);
        }
    });
});

// =============================================================
//  DATA HELPERS (subjects, etc.)
// =============================================================
function getUserDataKey() {
    return `academicData_${currentUser}`;
}
function loadUserData() {
    const key = getUserDataKey();
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
}
function saveUserData(data) {
    const key = getUserDataKey();
    localStorage.setItem(key, JSON.stringify(data));
}

// =============================================================
//  GLOBAL EXPORTS
// =============================================================
window.navigateTo = navigateTo;
window.logout = logout;
window.loadUserData = loadUserData;
window.saveUserData = saveUserData;
window.getUsers = getUsers;
window.saveUsers = saveUsers;
window.applyProfilePictures = applyProfilePictures;
window.DEFAULT_AVATAR = DEFAULT_AVATAR;
window.currentUser = currentUser;
