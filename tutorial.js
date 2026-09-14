// =============================================================
//  INTERACTIVE TUTORIAL  (action-driven)
//  - Action steps highlight ONE element and advance when the user
//    clicks it. A four-panel mask dims everything else.
//  - Information steps just show a centered tooltip with Next.
//  - Steps verify their target exists before showing; if not,
//    they skip themselves so the tour stays accurate.
// =============================================================
(function () {

    // -------------------------------------------------------------
    //  STEP DEFINITIONS
    //  type: 'info'   → centered tooltip, Next button, no highlight
    //  type: 'action' → highlights the target and waits for a click
    //  waitForClick   → CSS selector (or fn) to watch for clicks
    //  hint           → text under the body, prompts the user
    // -------------------------------------------------------------
    const STEPS = [
        {
            id: 'welcome',
            page: 'dashboard',
            type: 'info',
            title: '👋 Welcome to Academic Tracker!',
            text: 'This quick tour walks through every feature. You can skip anytime and restart from the <strong>?</strong> button in the header.',
            nextText: 'Start Tour'
        },
        {
            id: 'stats',
            page: 'dashboard',
            type: 'info',
            title: '📊 Live Stats',
            text: 'These four cards summarise your whole academic record: <strong>Total Average</strong>, <strong>Semester 1</strong>, <strong>Semester 2</strong>, and <strong>Subject count</strong>. They update automatically as you enter scores.'
        },
        {
            id: 'click-add-subject',
            page: 'dashboard',
            type: 'action',
            target: '.dashboard-page .sidebar-panel .input-row input',
            waitForClick: '#addSubjectBtn',
            title: '➕ Add a Subject',
            text: 'Type a subject name, then click <strong>Add</strong>. The subject will appear in the list below and on the Subjects page.',
            hint: 'Click the Add button to continue.'
        },
        {
            id: 'subjects-list',
            page: 'dashboard',
            type: 'info',
            target: '.dashboard-page #subjectsList',
            title: '📚 Your Subjects',
            text: 'Every subject you own lives here. Click one to see its score breakdown on the right.'
        },
        {
            id: 'click-subject-card',
            page: 'dashboard',
            type: 'action',
            target: '.dashboard-page #subjectsList .subject-card',
            waitForClick: '.dashboard-page #subjectsList .subject-card',
            title: '👆 Open a Subject',
            text: 'Click any subject card to see its quarterly detail view.',
            hint: 'Click a subject card to continue.',
            skipIfTargetMissing: true
        },
        {
            id: 'detail',
            page: 'dashboard',
            type: 'info',
            target: '.dashboard-page #subjectDetail .period-tabs',
            title: '👁️ Detail View (Read-Only)',
            text: 'The right panel shows the subject\'s score breakdown. Use the <strong>Q1–Q4</strong>, <strong>Final Exam</strong>, <strong>S1</strong>, <strong>S2</strong>, and <strong>Total</strong> tabs. Edits happen on the Subjects page.',
            skipIfTargetMissing: true
        },
        {
            id: 'nav-subjects',
            page: 'dashboard',
            type: 'action',
            target: '.app-sidebar .nav-item[data-page="subjects"]',
            waitForClick: '.app-sidebar .nav-item[data-page="subjects"]',
            title: '✏️ Time to Edit',
            text: 'Click the <strong>Subjects</strong> tab to open the editing workspace.',
            hint: 'Click Subjects in the sidebar.'
        },
        {
            id: 'subjects-overview',
            page: 'subjects',
            type: 'info',
            target: '#subjectsList',
            title: '📖 All Subjects',
            text: 'Each card shows the subject name, assignment count, current grade, quarter averages, and final exam status.',
            skipIfTargetMissing: true
        },
        {
            id: 'click-subject-editor',
            page: 'subjects',
            type: 'action',
            target: '#subjectsList .subject-card',
            waitForClick: '#subjectsList .subject-card',
            title: '🎯 Open the Editor',
            text: 'Click a subject to open the modal editor.',
            hint: 'Click any subject card to continue.',
            skipIfTargetMissing: true
        },
        {
            id: 'period-tabs',
            page: 'subjects',
            type: 'info',
            target: '#editorContainer .period-tabs',
            title: '🗂️ Quarters & Semesters',
            text: '<strong>Q1–Q4</strong> are the four quarters. <strong>📝 Final Exam</strong> counts for <strong>30%</strong> of the total grade. <strong>S1</strong> and <strong>S2</strong> are semester averages. <strong>Total</strong> is the final weighted grade.',
            skipIfTargetMissing: true
        },
        {
            id: 'click-assignment-form',
            page: 'subjects',
            type: 'action',
            target: '#editorContainer .assignment-panel',
            waitForClick: '#addAssignmentBtn',
            title: '➕ Add an Assignment',
            text: 'Enter a name, score and max, then click <strong>Add Assignment</strong>. Within a quarter, minors and majors weigh 40% / 60%.',
            hint: 'Click Add Assignment when you\'re ready.',
            before: async () => {
                const q1 = document.querySelector('#editorContainer .period-tab[data-period="Q1"]');
                if (q1 && !document.querySelector('#editorContainer .assignment-panel')) {
                    q1.click();
                    await waitFor('#editorContainer .assignment-panel');
                }
            },
            skipIfTargetMissing: true
        },
        {
            id: 'manual-avg',
            page: 'subjects',
            type: 'info',
            target: '#editorContainer .average-setter',
            title: '🎚️ Manual Average Override',
            text: 'Set a quarter average directly to override the calculated value. Useful for transfer credits or teacher-provided averages. Clear it whenever you want the automatic average back.',
            skipIfTargetMissing: true
        },
        {
            id: 'click-final-exam-tab',
            page: 'subjects',
            type: 'action',
            target: '#editorContainer .period-tab[data-period="Final Exam"]',
            waitForClick: '#editorContainer .period-tab[data-period="Final Exam"]',
            title: '📝 Final Exam',
            text: 'Click the <strong>📝 Final Exam</strong> tab to add or update the year-end exam score.',
            hint: 'Click the Final Exam tab to continue.',
            skipIfTargetMissing: true
        },
        {
            id: 'close-editor',
            page: 'subjects',
            type: 'action',
            target: '#closeModalBtn',
            waitForClick: '#closeModalBtn',
            title: '✖️ Close the Editor',
            text: 'When you\'re done, click the <strong>X</strong> to close the editor and return to the subject list.',
            hint: 'Click the X button to continue.',
            skipIfTargetMissing: true
        },
        {
            id: 'nav-calendar',
            page: 'subjects',
            type: 'action',
            target: '.app-sidebar .nav-item[data-page="calendar"]',
            waitForClick: '.app-sidebar .nav-item[data-page="calendar"]',
            title: '📅 Deadlines Calendar',
            text: 'Track assignments, tests, and project deadlines per day. Click <strong>Calendar</strong> to continue.',
            hint: 'Click Calendar in the sidebar.'
        },
        {
            id: 'calendar-grid',
            page: 'calendar',
            type: 'info',
            target: '#calendarGrid',
            title: '📅 Calendar Grid',
            text: 'Click any day to select it. Days with deadlines show a small <strong>red dot</strong>. Use the arrows at the top to move between months.'
        },
        {
            id: 'add-deadline',
            page: 'calendar',
            type: 'action',
            target: '.add-event-form',
            waitForClick: '#addEventBtn',
            title: '➕ Add a Deadline',
            text: 'Give it a title, an optional time, and an optional description. Click <strong>Add Deadline</strong> to save.',
            hint: 'Fill in a title and click Add Deadline.'
        },
        {
            id: 'nav-notes',
            page: 'calendar',
            type: 'action',
            target: '.app-sidebar .nav-item[data-page="notes"]',
            waitForClick: '.app-sidebar .nav-item[data-page="notes"]',
            title: '📝 Notes',
            text: 'A freeform scratchpad. Click <strong>Notes</strong> in the sidebar.',
            hint: 'Click Notes in the sidebar.'
        },
        {
            id: 'notes-editor',
            page: 'notes',
            type: 'info',
            target: '#notesTextarea',
            title: '📝 Auto-Saving Notes',
            text: 'Type anything — notes <strong>auto-save</strong> as you go. A brief "💾 Autosaved" indicator confirms each save. Press <strong>Ctrl/Cmd + S</strong> to force an immediate save.'
        },
        {
            id: 'nav-profile',
            page: 'notes',
            type: 'action',
            target: '.app-sidebar .nav-item[data-page="profile"]',
            waitForClick: '.app-sidebar .nav-item[data-page="profile"]',
            title: '👤 Profile',
            text: 'Avatar, password, backups, and account management. Click <strong>Profile</strong> in the sidebar.',
            hint: 'Click Profile in the sidebar.'
        },
        {
            id: 'profile-overview',
            page: 'profile',
            type: 'info',
            target: '.profile-info',
            title: '👤 Profile Overview',
            text: 'Your username, member-since date, overall average, and totals for subjects and assignments.'
        },
        {
            id: 'profile-avatar',
            page: 'profile',
            type: 'info',
            target: '.profile-pic-wrapper',
            title: '🖼️ Profile Picture',
            text: 'Click your avatar — or the <strong>Upload</strong> button — to set a custom image. Click <strong>Remove</strong> to fall back to the default avatar.'
        },
        {
            id: 'profile-data',
            page: 'profile',
            type: 'info',
            target: '.profile-section:has(#exportDataBtn)',
            title: '💾 Backups',
            text: 'Download all your data as JSON, or restore from a previous backup. Works across devices.'
        },
        {
            id: 'profile-danger',
            page: 'profile',
            type: 'info',
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
    let clickWatcher = null;         // { el, handler }
    let resizeHandler = null;

    // -------------------------------------------------------------
    //  HELPERS
    // -------------------------------------------------------------
    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

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
        const activePage = document.querySelector('.page-container.active');
        if (activePage && activePage.id) return activePage.id.replace('page-', '');
        return 'dashboard';
    }

    function resolveSelector(raw) {
        if (!raw) return null;
        const sel = typeof raw === 'function' ? raw() : raw;
        return sel || null;
    }
    function resolveTarget(step) { return resolveSelector(step.target) ? document.querySelector(resolveSelector(step.target)) : null; }
    function resolveClick(step)  { return resolveSelector(step.waitForClick); }

    // -------------------------------------------------------------
    //  DOM  (injected once)
    //  The mask is 4 divs around the highlighted element so the
    //  target itself remains interactive.
    // -------------------------------------------------------------
    function ensureDom() {
        if (domReady) return;
        if (document.getElementById('tutTooltip')) { domReady = true; return; }

        const frag = document.createElement('div');
        frag.innerHTML = `
            <div class="tut-mask" id="tutMaskTop"></div>
            <div class="tut-mask" id="tutMaskBottom"></div>
            <div class="tut-mask" id="tutMaskLeft"></div>
            <div class="tut-mask" id="tutMaskRight"></div>
            <div class="tut-highlight" id="tutHighlight"></div>
            <div class="tut-tooltip" id="tutTooltip">
                <div class="tt-arrow" id="ttArrow"></div>
                <div class="tt-title" id="ttTitle"></div>
                <div class="tt-text" id="ttText"></div>
                <div class="tt-hint" id="ttHint"></div>
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
        const logoutBtn = headerRight.querySelector('#headerLogoutBtn');
        if (logoutBtn) headerRight.insertBefore(btn, logoutBtn);
        else headerRight.appendChild(btn);
    }

    // -------------------------------------------------------------
    //  MASKS  (four panels around the target)
    // -------------------------------------------------------------
    function positionMasks(rect, pad) {
        const top    = document.getElementById('tutMaskTop');
        const bottom = document.getElementById('tutMaskBottom');
        const left   = document.getElementById('tutMaskLeft');
        const right  = document.getElementById('tutMaskRight');
        if (!top || !bottom || !left || !right) return;

        const vw = window.innerWidth;
        const vh = window.innerHeight;

        const x = rect.left - pad;
        const y = rect.top - pad;
        const w = rect.width + pad * 2;
        const h = rect.height + pad * 2;

        // Top panel: full width, from top to top of target
        set(top, 0, 0, vw, Math.max(0, y));
        // Bottom panel
        set(bottom, 0, y + h, vw, Math.max(0, vh - (y + h)));
        // Left panel
        set(left, 0, y, Math.max(0, x), h);
        // Right panel
        set(right, x + w, y, Math.max(0, vw - (x + w)), h);

        [top, bottom, left, right].forEach(p => p.classList.add('active'));
    }

    function set(el, left, top, width, height) {
        el.style.left = left + 'px';
        el.style.top = top + 'px';
        el.style.width = width + 'px';
        el.style.height = height + 'px';
    }

    function hideMasks() {
        ['tutMaskTop', 'tutMaskBottom', 'tutMaskLeft', 'tutMaskRight']
            .forEach(id => document.getElementById(id)?.classList.remove('active'));
    }

    // -------------------------------------------------------------
    //  UI
    // -------------------------------------------------------------
    function hideUi() {
        hideMasks();
        const h = document.getElementById('tutHighlight');
        if (h) { h.classList.remove('active'); h.style.display = 'none'; }
        const t = document.getElementById('tutTooltip');
        if (t) { t.classList.remove('active', 'centered'); }
        detachClickWatcher();
    }

    function detachClickWatcher() {
        if (clickWatcher) {
            document.removeEventListener('click', clickWatcher.handler, true);
            clickWatcher = null;
        }
    }

    function renderTooltip(step, targetEl) {
        const tooltip = document.getElementById('tutTooltip');
        const highlight = document.getElementById('tutHighlight');
        const arrow = document.getElementById('ttArrow');
        const hintEl = document.getElementById('ttHint');
        if (!tooltip || !highlight || !arrow) return;

        document.getElementById('ttTitle').textContent = step.title;
        document.getElementById('ttText').innerHTML = step.text;
        document.getElementById('ttStepNow').textContent = idx + 1;

        // Hint text (for action steps)
        if (hintEl) {
            hintEl.textContent = step.hint || '';
            hintEl.style.display = step.hint ? 'block' : 'none';
        }

        // Next button: only meaningful on info steps
        const nextBtn = document.getElementById('ttNext');
        const isAction = step.type === 'action' && targetEl;
        if (isAction) {
            nextBtn.style.display = 'none';
        } else {
            nextBtn.style.display = '';
            nextBtn.textContent = step.nextText || (idx === STEPS.length - 1 ? 'Finish Tour' : 'Next');
            nextBtn.className = idx === STEPS.length - 1 ? 'tt-next done' : 'tt-next';
        }

        tooltip.classList.remove('centered');
        highlight.classList.remove('active');
        highlight.style.display = 'none';
        hideMasks();

        // Centered info steps (no target)
        if (!targetEl || step.type === 'info' && !targetEl) {
            tooltip.style.left = '50%';
            tooltip.style.top = '50%';
            tooltip.style.transform = 'translate(-50%, -50%)';
            tooltip.classList.add('active', 'centered');
            return;
        }

        // Position highlight + masks
        const rect = targetEl.getBoundingClientRect();
        const pad = 8;

        highlight.style.left = (rect.left - pad) + 'px';
        highlight.style.top = (rect.top - pad) + 'px';
        highlight.style.width = (rect.width + pad * 2) + 'px';
        highlight.style.height = (rect.height + pad * 2) + 'px';
        highlight.classList.add('active');
        highlight.style.display = 'block';
        positionMasks(rect, pad);

        // Position tooltip near the target
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
            // Not enough room above or below — centre it
            tooltip.style.left = '50%';
            tooltip.style.top = '50%';
            tooltip.style.transform = 'translate(-50%, -50%)';
            tooltip.classList.add('active', 'centered');
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

        if (rect.top < 0 || rect.bottom > vh) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => renderTooltip(step, targetEl), 400);
        }
    }

    // -------------------------------------------------------------
    //  ACTION STEP  →  wait for user to click the highlighted element
    // -------------------------------------------------------------
    function attachClickWatcher(step) {
        const sel = resolveClick(step);
        if (!sel) return;

        detachClickWatcher();

        clickWatcher = {
            handler: function (e) {
                const hit = e.target.closest(sel);
                if (!hit) return;

                console.log('[tutorial] action confirmed for step:', step.id);
                detachClickWatcher();

                // Let the click's native handler run first, then advance
                setTimeout(() => {
                    if (step.id === 'click-subject-editor' || step.id === 'click-subject-card') {
                        // Wait for the editor to appear before advancing
                        waitFor('#editorContainer .period-tabs', 1500).then(() => advance());
                    } else if (step.id === 'click-add-subject') {
                        // Wait for the new card to appear
                        waitFor('.dashboard-page #subjectsList .subject-card', 1500).then(() => advance());
                    } else if (step.id === 'add-deadline') {
                        waitFor('.event-item', 1500).then(() => advance());
                    } else {
                        advance();
                    }
                }, 120);
            }
        };
        document.addEventListener('click', clickWatcher.handler, true);
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
            localStorage.removeItem('tutorial_seen_' + currentTutUser);
        }
        showStep();
    }

    function advance() {
        if (!active) return;
        detachClickWatcher();
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

        // Navigate to the right page first
        const wanted = step.page || 'dashboard';
        if (currentPageName() !== wanted) {
            awaitingPage = wanted;
            if (typeof window.navigateTo === 'function') {
                window.navigateTo(wanted);
            } else {
                console.warn('[tutorial] navigateTo not available');
                return finish();
            }
            return;
        }

        awaitingPage = null;
        hideUi();

        // Optional prelude
        if (step.before) {
            try {
                await step.before();
            } catch (e) {
                if (String(e && e.message) === 'no-subjects') {
                    console.warn(`[tutorial] Skipping "${step.id}": no subjects`);
                    return advance();
                }
                console.warn('[tutorial] before() failed:', e);
            }
        }

        await sleep(120);
        const targetEl = resolveTarget(step);

        // Skip if the step needs a target that isn't there
        if (step.target && !targetEl && step.type !== 'info') {
            console.warn(`[tutorial] Skipping "${step.id}": target "${resolveSelector(step.target)}" not found`);
            return advance();
        }
        // Info step whose target isn't visible → show centered
        if (step.target && !targetEl && step.type === 'info') {
            requestAnimationFrame(() => renderTooltip(step, null));
            return;
        }

        requestAnimationFrame(() => {
            renderTooltip(step, targetEl);
            if (step.type === 'action') {
                attachClickWatcher(step);
            }
        });
    }

    // -------------------------------------------------------------
    //  EVENTS
    // -------------------------------------------------------------
    document.addEventListener('pageLoaded', function (e) {
        if (!active) return;
        const loaded = e.detail && e.detail.page;
        if (awaitingPage && loaded === awaitingPage) {
            setTimeout(() => showStep(), 150);
        }
    });

    resizeHandler = function () {
        if (!active) return;
        const step = STEPS[idx];
        if (!step) return;
        const targetEl = resolveTarget(step);
        renderTooltip(step, targetEl);
    };
    window.addEventListener('resize', resizeHandler);

    document.addEventListener('keydown', function (e) {
        if (!active) return;
        if (e.key === 'Escape') {
            if (confirm('Close the tour?')) finish();
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            advance();
        }
    });

    // -------------------------------------------------------------
    //  INIT
    // -------------------------------------------------------------
    function boot() {
        currentTutUser = localStorage.getItem('currentUser');
        if (!currentTutUser) return;

        ensureDom();

        const seenKey = 'tutorial_seen_' + currentTutUser;
        if (!localStorage.getItem(seenKey)) {
            setTimeout(() => {
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

    window.startTutorial = () => start(true);
    window.skipTutorial = skipTour;

})();
