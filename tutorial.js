// =============================================================
//  INTERACTIVE TUTORIAL
//  - Navigates between pages
//  - Verifies each step's target exists before showing it
//    (so the tutorial never lies about the current UI)
//  - Skips steps whose targets are missing
//  - Saves per-user completion flag
// =============================================================
(function () {

    // -------------------------------------------------------------
    //  STEP DEFINITIONS
    //  Each step:
    //    id       – internal name (debugging)
    //    page     – which app page we need to be on
    //    target   – CSS selector (or fn returning a selector)
    //    title    – tooltip heading
    //    text     – tooltip body (HTML allowed)
    //    before   – optional async hook that runs before showing
    //    centered – if true, tooltip floats center-screen (no target)
    //    nextText – label for the primary button
    //  Steps with a target that can't be found are automatically
    //  skipped, keeping the tour in sync with the actual UI.
    // -------------------------------------------------------------
    const STEPS = [
        {
            id: 'welcome',
            page: 'dashboard',
            centered: true,
            title: '👋 Welcome to Academic Tracker!',
            text: 'This quick tour walks through every feature. You can skip anytime and restart from the <strong>?</strong> button in the header.',
            nextText: 'Start Tour'
        },
        {
            id: 'stats',
            page: 'dashboard',
            target: '.dashboard-page .stats-grid',
            title: '📊 Live Stats',
            text: 'These four cards summarise everything: <strong>Total Average</strong>, <strong>Semester 1</strong>, <strong>Semester 2</strong>, and your <strong>Subject count</strong>. They update automatically as you enter scores.'
        },
        {
            id: 'add-subject',
            page: 'dashboard',
            target: '.dashboard-page .sidebar-panel .input-row',
            title: '➕ Add a Subject',
            text: 'Type a subject name and click <strong>Add</strong>. It appears in the list below and on the Subjects page — they share the same data.'
        },
        {
            id: 'subjects-list',
            page: 'dashboard',
            target: '.dashboard-page #subjectsList',
            title: '📚 Your Subjects',
            text: 'Every subject you own lives here. Click one to see its detail view on the right.'
        },
        {
            id: 'detail',
            page: 'dashboard',
            target: '.dashboard-page #subjectDetail',
            title: '👁️ Detail View (Read-Only)',
            text: 'The right panel shows the selected subject\'s score breakdown. Use the <strong>Q1–Q4</strong>, <strong>Final Exam</strong>, <strong>S1</strong>, <strong>S2</strong>, and <strong>Total</strong> tabs. Editing happens on the Subjects page.',
            before: async () => {
                // Auto-select the first subject if one exists so the detail view is populated
                const card = document.querySelector('.dashboard-page #subjectsList .subject-card');
                if (card) {
                    card.click();
                    await waitFor('.dashboard-page #subjectDetail .period-tabs');
                }
            },
            skipIfTargetMissing: true
        },
        {
            id: 'nav-subjects',
            page: 'dashboard',
            target: '.app-sidebar .nav-item[data-page="subjects"]',
            title: '✏️ Time to Edit',
            text: 'Click <strong>Next</strong> and I\'ll take you to the Subjects page where you can add assignments and set final exam scores.'
        },
        {
            id: 'subjects-overview',
            page: 'subjects',
            target: '#subjectsList',
            title: '📖 All Subjects',
            text: 'Each card shows the subject name, assignment count, current grade, quarter averages, and final exam status. Click any card to open the editor.'
        },
        {
            id: 'open-editor',
            page: 'subjects',
            target: '#editorContainer',
            title: '🎯 Opening the Editor',
            text: 'Clicking a subject opens this modal editor. Use the tabs to switch between quarters and the final exam.',
            before: async () => {
                const card = document.querySelector('#subjectsList .subject-card');
                if (card) {
                    card.click();
                    await waitFor('#editorContainer .period-tabs');
                } else {
                    // No subjects yet — skip this step's target so it centres instead
                    throw new Error('no-subjects');
                }
            },
            skipIfTargetMissing: true
        },
        {
            id: 'period-tabs',
            page: 'subjects',
            target: '#editorContainer .period-tabs',
            title: '🗂️ Quarters & Semesters',
            text: '<strong>Q1–Q4</strong> are the four quarters. <strong>📝 Final Exam</strong> is weighted at <strong>30%</strong> of the total. <strong>S1</strong> and <strong>S2</strong> are semester averages. <strong>Total</strong> is the final weighted grade.',
            skipIfTargetMissing: true
        },
        {
            id: 'assignments',
            page: 'subjects',
            target: '#editorContainer .assignment-panel',
            title: '➕ Add an Assignment',
            text: 'Enter a name, score and max, then choose <strong>Minor</strong> or <strong>Major</strong>. Within a quarter, minor and major each contribute 40% / 60%.',
            before: async () => {
                // Ensure we're on a quarter tab (Q1) so the assignment panel exists
                const q1 = document.querySelector('#editorContainer .period-tab[data-period="Q1"]');
                if (q1) {
                    q1.click();
                    await waitFor('#editorContainer .assignment-panel');
                }
            },
            skipIfTargetMissing: true
        },
        {
            id: 'manual-avg',
            page: 'subjects',
            target: '#editorContainer .average-setter',
            title: '🎚️ Manual Average Override',
            text: 'Want to set a quarter average directly? Enter it here. It overrides the calculated average until you clear it. Useful for transfer credits or teacher-provided averages.',
            skipIfTargetMissing: true
        },
        {
            id: 'final-exam-tab',
            page: 'subjects',
            target: '#editorContainer .period-tab[data-period="Final Exam"]',
            title: '📝 Final Exam',
            text: 'Click this tab to add or update your year-end exam score. It counts toward <strong>30% of the total grade</strong>.',
            before: async () => {
                // Close the modal so we can continue to the next page cleanly
                const closeBtn = document.getElementById('closeModalBtn');
                if (closeBtn && document.getElementById('editorModal').classList.contains('active')) {
                    closeBtn.click();
                    await sleep(200);
                }
            },
            skipIfTargetMissing: true
        },
        {
            id: 'nav-calendar',
            page: 'subjects',
            target: '.app-sidebar .nav-item[data-page="calendar"]',
            title: '📅 Deadlines Calendar',
            text: 'Track assignments, tests, and project deadlines per day. Click <strong>Next</strong> to visit the calendar.'
        },
        {
            id: 'calendar-grid',
            page: 'calendar',
            target: '#calendarGrid',
            title: '📅 Calendar Grid',
            text: 'Click any day to select it. Days with deadlines show a small <strong>red dot</strong>. Use the arrows at the top to move between months.'
        },
        {
            id: 'calendar-add',
            page: 'calendar',
            target: '.add-event-form',
            title: '➕ Add a Deadline',
            text: 'Give it a title, an optional time, and an optional description. The deadline will be attached to whichever day is selected.'
        },
        {
            id: 'nav-notes',
            page: 'calendar',
            target: '.app-sidebar .nav-item[data-page="notes"]',
            title: '📝 Notes',
            text: 'A freeform scratchpad. Click <strong>Next</strong> to visit it.'
        },
        {
            id: 'notes-editor',
            page: 'notes',
            target: '#notesTextarea',
            title: '📝 Auto-Saving Notes',
            text: 'Type anything — notes <strong>auto-save</strong> as you go. A brief "💾 Autosaved" indicator confirms each save. Press <strong>Ctrl/Cmd + S</strong> to force an immediate save.'
        },
        {
            id: 'nav-profile',
            page: 'notes',
            target: '.app-sidebar .nav-item[data-page="profile"]',
            title: '👤 Profile',
            text: 'Avatar, password, backups, and account management live here. Click <strong>Next</strong> to visit.'
        },
        {
            id: 'profile-overview',
            page: 'profile',
            target: '.profile-info',
            title: '👤 Profile Overview',
            text: 'Your username, member-since date, overall average, and total subject/assignment counts.'
        },
        {
            id: 'profile-avatar',
            page: 'profile',
            target: '.profile-pic-wrapper',
            title: '🖼️ Profile Picture',
            text: 'Click your avatar — or the <strong>Upload</strong> button — to set a custom image. Click <strong>Remove</strong> to fall back to the default avatar.'
        },
        {
            id: 'profile-data',
            page: 'profile',
            target: '#exportDataBtn',
            title: '💾 Backups',
            text: 'Download all your data as JSON, or restore from a previous backup. Works across devices — perfect for syncing.'
        },
        {
            id: 'profile-danger',
            page: 'profile',
            target: '.profile-section.danger-zone',
            title: '⚠️ Danger Zone',
            text: 'Delete your account (only your data) or wipe <strong>everything</strong> for every user on this browser. Both actions are irreversible.',
            nextText: 'Finish Tour'
        }
    ];

    // -------------------------------------------------------------
    //  STATE
    // -------------------------------------------------------------
    let active = false;
    let idx = 0;
    let awaitingPage = null;
    let currentTutUser = null;
    let domReady = false;

    // -------------------------------------------------------------
    //  HELPERS
    // -------------------------------------------------------------
    function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    function waitFor(selector, timeout = 3000) {
        return new Promise(resolve => {
            const existing = document.querySelector(selector);
            if (existing) return resolve(existing);
            const start = Date.now();
            const obs = new MutationObserver(() => {
                const el = document.querySelector(selector);
                if (el) { obs.disconnect(); resolve(el); }
                else if (Date.now() - start > timeout) { obs.disconnect(); resolve(null); }
            });
            obs.observe(document.body, { childList: true, subtree: true });
            setTimeout(() => {
                obs.disconnect();
                resolve(document.querySelector(selector));
            }, timeout);
        });
    }

    function currentPageName() {
        const el = document.getElementById('pageTitle');
        if (el) return el.textContent.toLowerCase();
        // Fallback: infer from which page-container is active
        const activePage = document.querySelector('.page-container.active');
        if (activePage && activePage.id) return activePage.id.replace('page-', '');
        return 'dashboard';
    }

    function resolveTarget(step) {
        if (!step.target) return null;
        const sel = typeof step.target === 'function' ? step.target() : step.target;
        if (!sel) return null;
        try { return document.querySelector(sel); }
        catch (e) { console.warn('[tutorial] bad selector:', sel, e); return null; }
    }

    // -------------------------------------------------------------
    //  DOM  (injected once)
    // -------------------------------------------------------------
    function ensureDom() {
        if (domReady) return;
        if (document.getElementById('tutOverlay')) { domReady = true; return; }

        const frag = document.createElement('div');
        frag.innerHTML = `
            <div class="tut-overlay" id="tutOverlay"></div>
            <div class="tut-highlight" id="tutHighlight"></div>
            <div class="tut-tooltip" id="tutTooltip">
                <div class="tt-arrow" id="ttArrow"></div>
                <div class="tt-title" id="ttTitle"></div>
                <div class="tt-text" id="ttText"></div>
                <div class="tt-actions">
                    <button class="tt-skip" id="ttSkip">Skip Tour</button>
                    <button class="tt-next" id="ttNext">Next</button>
                </div>
                <div class="tt-progress">
                    Step <span id="ttStepNow">1</span> of <span id="ttStepTotal">${STEPS.length}</span>
                </div>
            </div>`;
        document.body.appendChild(frag);

        document.getElementById('ttSkip').addEventListener('click', skipTour);
        document.getElementById('ttNext').addEventListener('click', advance);

        // Inject the "?" restart button into the app header
        injectHelpButton();

        domReady = true;
    }

    function injectHelpButton() {
        const headerRight = document.querySelector('.app-header .right');
        if (!headerRight || headerRight.querySelector('.tut-help-btn')) return;

        const btn = document.createElement('button');
        btn.className = 'tut-help-btn';
        btn.title = 'Restart interactive tour';
        btn.innerHTML = '<i class="fas fa-question"></i>';
        btn.addEventListener('click', () => start(true));
        // Place it before the logout button so it sits next to the username
        const logoutBtn = headerRight.querySelector('#headerLogoutBtn');
        if (logoutBtn) headerRight.insertBefore(btn, logoutBtn);
        else headerRight.appendChild(btn);
    }

    // -------------------------------------------------------------
    //  UI  (highlight + tooltip positioning)
    // -------------------------------------------------------------
    function hideUi() {
        document.getElementById('tutOverlay')?.classList.remove('active');
        const h = document.getElementById('tutHighlight');
        if (h) { h.classList.remove('active'); h.style.display = 'none'; }
        document.getElementById('tutTooltip')?.classList.remove('active', 'centered');
    }

    function renderTooltip(step, targetEl) {
        const tooltip = document.getElementById('tutTooltip');
        const highlight = document.getElementById('tutHighlight');
        const arrow = document.getElementById('ttArrow');
        const overlay = document.getElementById('tutOverlay');
        if (!tooltip || !highlight || !arrow || !overlay) return;

        // Fill content
        document.getElementById('ttTitle').textContent = step.title;
        document.getElementById('ttText').innerHTML = step.text;
        document.getElementById('ttStepNow').textContent = idx + 1;

        const nextBtn = document.getElementById('ttNext');
        nextBtn.textContent = step.nextText || (idx === STEPS.length - 1 ? 'Finish Tour' : 'Next');
        nextBtn.className = idx === STEPS.length - 1 ? 'tt-next done' : 'tt-next';

        overlay.classList.add('active');
        tooltip.classList.remove('centered');
        highlight.classList.remove('active');
        highlight.style.display = 'none';

        // If centred (no target), show in the middle of the screen
        if (!targetEl || step.centered) {
            tooltip.style.left = '50%';
            tooltip.style.top = '50%';
            tooltip.style.transform = 'translate(-50%, -50%)';
            tooltip.classList.add('active', 'centered');
            return;
        }

        // Highlight target
        const rect = targetEl.getBoundingClientRect();
        const pad = 10;
        highlight.style.left = (rect.left - pad) + 'px';
        highlight.style.top = (rect.top - pad) + 'px';
        highlight.style.width = (rect.width + pad * 2) + 'px';
        highlight.style.height = (rect.height + pad * 2) + 'px';
        highlight.classList.add('active');
        highlight.style.display = 'block';

        // Position tooltip near target
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const tipW = 420;
        const tipH = tooltip.offsetHeight || 260;

        let ttLeft = rect.left + rect.width / 2 - tipW / 2;
        let ttTop = rect.bottom + 22;
        let arrowDir = 'bottom';

        if (ttTop + tipH > vh - 10) {
            ttTop = rect.top - tipH - 22;
            arrowDir = 'top';
        }
        if (ttTop < 10) {
            // Fallback to center if no room
            tooltip.style.left = '50%';
            tooltip.style.top = '50%';
            tooltip.style.transform = 'translate(-50%, -50%)';
            tooltip.classList.add('active', 'centered');
            highlight.classList.remove('active');
            highlight.style.display = 'none';
            return;
        }
        if (ttLeft < 10) ttLeft = 10;
        if (ttLeft + tipW > vw - 10) ttLeft = vw - tipW - 10;

        tooltip.style.left = ttLeft + 'px';
        tooltip.style.top = ttTop + 'px';
        tooltip.style.transform = 'none';
        arrow.className = 'tt-arrow';
        if (arrowDir === 'top') arrow.classList.add('top');

        tooltip.classList.add('active');

        // Scroll target into view if off-screen
        if (rect.top < 0 || rect.bottom > vh) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Re-position once the scroll settles
            setTimeout(() => renderTooltip(step, targetEl), 400);
        }
    }

    // -------------------------------------------------------------
    //  FLOW
    // -------------------------------------------------------------
    function start(forceRestart) {
        currentTutUser = localStorage.getItem('currentUser');
        if (!currentTutUser) return;

        ensureDom();
        active = true;
        idx = 0;
        awaitingPage = null;

        if (forceRestart) {
            // Make sure the tutorial flag is fresh
            localStorage.removeItem('tutorial_seen_' + currentTutUser);
        }
        showStep();
    }

    function advance() {
        if (!active) return;
        idx++;
        if (idx >= STEPS.length) return finish();
        showStep();
    }

    function finish() {
        active = false;
        awaitingPage = null;
        hideUi();
        if (currentTutUser) {
            localStorage.setItem('tutorial_seen_' + currentTutUser, 'true');
        }
    }

    function skipTour() {
        if (!confirm('Skip the rest of the tour? You can restart it anytime from the "?" button in the header.')) return;
        finish();
    }

    async function showStep() {
        if (!active) return;
        const step = STEPS[idx];
        if (!step) return finish();

        // Make sure we're on the right page
        const wanted = step.page || 'dashboard';
        if (currentPageName() !== wanted) {
            awaitingPage = wanted;
            if (typeof window.navigateTo === 'function') {
                window.navigateTo(wanted);
            } else {
                console.warn('[tutorial] navigateTo not available');
                return finish();
            }
            // The pageLoaded listener will call us again
            return;
        }

        awaitingPage = null;
        hideUi();

        // Run the async prelude (if any)
        if (step.before) {
            try {
                await step.before();
            } catch (e) {
                if (String(e && e.message) === 'no-subjects') {
                    // Special case: nothing to show; skip the step
                    console.warn(`[tutorial] Skipping "${step.id}": no subjects available`);
                    return advance();
                }
                console.warn('[tutorial] before() failed:', e);
            }
        }

        // Small settle delay so the DOM has updated
        await sleep(120);

        const targetEl = resolveTarget(step);

        // If the step has a target and we can't find it, skip it so we
        // stay accurate to the current UI
        if (step.target && !targetEl && !step.centered) {
            console.warn(`[tutorial] Skipping "${step.id}": target "${step.target}" not found`);
            return advance();
        }

        // Delay a tick for scroll/animations
        requestAnimationFrame(() => renderTooltip(step, targetEl));
    }

    // -------------------------------------------------------------
    //  PAGE / VIEWPORT EVENTS
    // -------------------------------------------------------------
    document.addEventListener('pageLoaded', function (e) {
        if (!active) return;
        const loaded = e.detail && e.detail.page;
        if (awaitingPage && loaded === awaitingPage) {
            // Give the page a moment to finish painting
            setTimeout(() => showStep(), 150);
        }
    });

    window.addEventListener('resize', function () {
        if (!active) return;
        const step = STEPS[idx];
        if (!step) return;
        const targetEl = resolveTarget(step);
        renderTooltip(step, targetEl);
    });

    document.addEventListener('keydown', function (e) {
        if (!active) return;
        if (e.key === 'Escape') {
            if (confirm('Close the tour?')) finish();
        } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
            // Only advance with Enter if focus isn't inside an input
            const tag = document.activeElement && document.activeElement.tagName;
            if (e.key === 'ArrowRight' || (e.key === 'Enter' && tag !== 'INPUT' && tag !== 'TEXTAREA')) {
                e.preventDefault();
                advance();
            }
        }
    });

    // -------------------------------------------------------------
    //  INIT
    // -------------------------------------------------------------
    function boot() {
        currentTutUser = localStorage.getItem('currentUser');
        if (!currentTutUser) return;

        ensureDom();

        // Auto-start on first login (after the app has painted)
        const seenKey = 'tutorial_seen_' + currentTutUser;
        if (!localStorage.getItem(seenKey)) {
            // Wait for app.js to finish loading the dashboard
            setTimeout(() => {
                // Only start if the app is actually visible
                const main = document.getElementById('mainApp');
                if (main && main.style.display !== 'none') {
                    start(false);
                }
            }, 900);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    // Expose for manual triggering / testing
    window.startTutorial = () => start(true);
    window.skipTutorial = skipTour;

})();