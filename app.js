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

// ----- Authentication check -----
function checkAuth() {
    currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
        window.location.href = 'login.html';
        return false;
    }
    document.getElementById('headerUsername').textContent = currentUser;
    document.getElementById('sidebarUsername').textContent = currentUser;
    return true;
}

// ----- Load page -----
async function loadPage(page) {
    if (!pageMap[page]) return;

    // Update active nav
    document.querySelectorAll('.nav-item, .bottom-nav .nav-icon').forEach(el => {
        el.classList.toggle('active', el.dataset.page === page);
    });
    document.getElementById('pageTitle').textContent = page.charAt(0).toUpperCase() + page.slice(1);
    currentPage = page;

    const container = document.getElementById('pageContainer');
    const pageInfo = pageMap[page];

    // Load CSS (if not already loaded)
    const cssId = 'page-css-' + page;
    if (!document.getElementById(cssId)) {
        const link = document.createElement('link');
        link.id = cssId;
        link.rel = 'stylesheet';
        link.href = pageInfo.css;
        document.head.appendChild(link);
    }

    // Load HTML
    try {
        const response = await fetch(pageInfo.html);
        if (!response.ok) throw new Error('Page not found');
        const html = await response.text();
        container.innerHTML = html;
    } catch (err) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Could not load page.</p></div>`;
        console.error(err);
    }

    // Load JS (if not already loaded)
    const scriptId = 'page-js-' + page;
    if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = pageInfo.js;
        // We'll use a custom event to notify the page that it's loaded
        script.onload = function() {
            const event = new CustomEvent('pageLoaded', { detail: { page, user: currentUser } });
            document.dispatchEvent(event);
        };
        document.body.appendChild(script);
    } else {
        // If script already exists, trigger the event anyway
        const event = new CustomEvent('pageLoaded', { detail: { page, user: currentUser } });
        document.dispatchEvent(event);
    }
}

// ----- Logout -----
function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

// ----- Navigation -----
function navigateTo(page) {
    if (page === currentPage) {
        // Reload the page if already on it
        loadPage(page);
        return;
    }
    loadPage(page);
    // Close sidebar on mobile
    closeSidebar();
}

// ----- Sidebar -----
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('active');
}
function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('active');
}

// ----- Initialization -----
document.addEventListener('DOMContentLoaded', function() {
    if (!checkAuth()) return;

    // Load default page (dashboard)
    loadPage('dashboard');

    // Event listeners for navigation
    document.querySelectorAll('.nav-item[data-page], .bottom-nav .nav-icon[data-page]').forEach(el => {
        el.addEventListener('click', function() {
            navigateTo(this.dataset.page);
        });
    });

    // Menu toggle
    document.getElementById('menuToggle').addEventListener('click', toggleSidebar);
    document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);

    // Handle page-specific init via custom event
    document.addEventListener('pageLoaded', function(e) {
        const page = e.detail.page;
        const user = e.detail.user;
        // Each page's JS can listen for this event and initialize itself
        // We'll also call a global init function if it exists
        if (typeof window.initPage === 'function') {
            window.initPage(page, user);
        }
    });
});

// ----- Data management functions for pages -----
// Each page can use these to read/write user data
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

// Expose to global scope
window.navigateTo = navigateTo;
window.logout = logout;
window.loadUserData = loadUserData;
window.saveUserData = saveUserData;
window.currentUser = currentUser;