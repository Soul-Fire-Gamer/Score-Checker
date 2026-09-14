// =============================================================
//  INTERACTIVE TUTORIAL  (action-driven with verification)
//  - Action steps highlight ONE element and only advance when
//    the user clicks it AND the expected DOM change actually
//    happened. Otherwise an inline error is shown.
//  - Info steps just show a tooltip with a Next button.
//  - Arrow position AND direction are set inline by JS.
//  - Auto-starts for brand-new accounts. Flag lives on the user
//    record so deleting an account resets it automatically.
// =============================================================
(function () {

    // -------------------------------------------------------------
    //  STEP DEFINITIONS
    // -------------------------------------------------------------
    const STEPS = [
        {
            id: 'welcome',
            page: 'dashboard',
            type: 'info',
            centered: true,
            title: '👋 Welcome to Academic Tracker!',
            text: 'This tour walks through every feature. Actions you need to perform will be highlighted — just click them to continue. You can skip anytime and restart from the <strong>?</strong> button in the header.',
            nextText: 'Start Tour'
        },
        {
            id: 'stats',
            page: 'dashboard',
            type: 'info',
            target: '.dashboard-page .stats-grid',
            title: '📊 Live Stats',
            text: 'These four cards summarise your whole academic record: <strong>Total Average</strong>, <strong>Semester 1</strong>, <strong>Semester 2</strong>, and <strong>Subject count</strong>. They update automatically as you enter scores.'
        },
        {
            id: 'click-add-subject',
            page: 'dashboard',
            type: 'action',
            target: '.dashboard-page .sidebar-panel .input-row',
            waitForClick: '#addSubjectBtn',
            prefill: () => {
                const input = document.getElementById('subjectInput');
                if (input && !input.value.trim()) {
                    input.value = 'Sample Subject';
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.focus();
                }
            },
            captureBefore: () => document.querySelectorAll('#subjectsList .subject-card').length,
            verify: (before) => document.querySelectorAll('#subjectsList .subject-card').length > before,
            verifyError: 'The subject wasn\'t added. Type a name in the input first, then click Add.',
            title: '➕ Add a Subject',
            text: 'Type a subject name, then click <strong>Add</strong>. I\'ve pre-filled a sample name for you — change it if you like.',
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
            verify: () => !!document.querySelector('.dashboard-page #subjectDetail .period-tabs'),
            verifyError: 'The subject detail didn\'t open. Try clicking the subject card again.',
            title: '👆 Open a Subject',
            text: 'Click any subject card to see its quarterly detail view.',
            hint: 'Click the subject card to continue.'
        },
        {
            id: 'detail',
            page: 'dashboard',
            type: 'info',
            target: '.dashboard-page #subjectDetail .period-tabs',
            title: '👁️ Detail View (Read-Only)',
            text: 'The right panel shows the subject\'s score breakdown. Use the <strong>Q1–Q4</strong>, <strong>Final Exam</strong>, <strong>S1</strong>, <strong>S2</strong>, and <strong>Total</strong> tabs. Edits happen on the Subjects page.'
        },
        {
            id: 'nav-subjects',
            page: 'dashboard',
            type: 'action',
            target: '.app-sidebar .nav-item[data-page="subjects"]',
            waitForClick: '.app-sidebar .nav-item[data-page="subjects"]',
            verify: () => document.getElementById('pageTitle').textContent.toLowerCase() === 'subjects',
            verifyError: 'Navigation didn\'t happen. Click Subjects in the sidebar.',
            title: '✏️ Time to Edit',
            text: 'Click <strong>Subjects</strong> in the sidebar to open the editing workspace.',
            hint: 'Click Subjects in the sidebar.'
        },
        {
            id: 'click-subject-editor',
            page: 'subjects',
            type: 'action',
            target: '#subjectsList .subject-card',
            waitForClick: '#subjectsList .subject-card',
            verify: () => document.getElementById('editorModal').classList.contains('active'),
            verifyError: 'The editor didn\'t open. Click a subject card to try again.',
            title: '🎯 Open the Editor',
            text: 'Click a subject to open the modal editor.',
            hint: 'Click a subject card to continue.'
        },
        {
            id: 'period-tabs',
            page: 'subjects',
            type: 'info',
            target: '#editorContainer .period-tabs',
            title: '🗂️ Quarters & Semesters',
            text: '<strong>Q1–Q4</strong> are the four quarters. <strong>📝 Final Exam</strong> counts for <strong>30%</strong> of the total grade. <strong>S1</strong> and <strong>S2</strong> are semester averages. <strong>Total</strong> is the final weighted grade.'
        },
        {
            id: 'click-assignment-form',
            page: 'subjects',
            type: 'action',
            target: '#editorContainer .assignment-panel',
            waitForClick: '#addAssignmentBtn',
            prefill: () => {
                const nameEl = document.getElementById('assignmentName');
                const scoreEl = document.getElementById('scoreObtained');
                const maxEl = document.getElementById('scoreMax');
                if (nameEl && !nameEl.value.trim()) {
                    nameEl.value = 'Sample Quiz';
                    nameEl.dispatchEvent(new Event('input', { bubbles: true }));
                }
                if (scoreEl && !scoreEl.value) {
                    scoreEl.value = '85';
                    scoreEl.dispatchEvent(new Event('input', { bubbles: true }));
                }
                if (maxEl && !maxEl.value) maxEl.value = '100';
            },
            captureBefore: () => document.querySelectorAll('#editorContainer .edit-assignment-btn').length,
            verify: (before) => document.querySelectorAll('#editorContainer .edit-assignment-btn').length > before,
            verifyError: 'The assignment wasn\'t added. Make sure Name, Score and Max are filled in.',
            title: '➕ Add an Assignment',
            text: 'Enter a name, score and max, then click <strong>Add Assignment</strong>. I\'ve pre-filled sample values for you.',
            hint: 'Click Add Assignment to continue.'
        },
        {
            id: 'manual-avg',
            page: 'subjects',
            type: 'info',
            target: '#editorContainer .average-setter',
            title: '🎚️ Manual Average Override',
            text: 'Set a quarter average directly to override the calculated value. Useful for transfer credits or teacher-provided averages.'
        },
        {
            id: 'click-final-exam-tab',
            page: 'subjects',
            type: 'action',
            target: '#editorContainer .period-tab[data-period="Final Exam"]',
            waitForClick: '#editorContainer .period-tab[data-period="Final Exam"]',
            verify: () => !!document.querySelector('#editorContainer .period-tab.active[data-period="Final Exam"]'),
            verifyError: 'The Final Exam tab didn\'t open. Click it again.',
            title: '📝 Final Exam',
            text: 'Click the <strong>📝 Final Exam</strong> tab to add or update the year-end exam score.',
            hint: 'Click the Final Exam tab to continue.'
        },
        {
            id: 'close-editor',
            page: 'subjects',
            type: 'action',
            target: '#closeModalBtn',
            waitForClick: '#closeModalBtn',
            verify: () => !document.getElementById('editorModal').classList.contains('active'),
            verifyError: 'The editor didn\'t close. Click the X button again.',
            title: '✖️ Close the Editor',
            text: 'When you\'re done, click the <strong>X</strong> to close the editor and return to the subject list.',
            hint: 'Click the X button to continue.'
        },
        {
            id: 'nav-calendar',
            page: 'subjects',
            type: 'action',
            target: '.app-sidebar .nav-item[data-page="calendar"]',
            waitForClick: '.app-sidebar .nav-item[data-page="calendar"]',
            verify: () => document.getElementById('pageTitle').textContent.toLowerCase() === 'calendar',
            verifyError: 'Navigation didn\'t happen. Click Calendar in the sidebar.',
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
            prefill: () => {
                const titleEl = document.getElementById('newEventTitle');
                if (titleEl && !titleEl.value.trim()) {
                    titleEl.value = 'Sample Deadline';
                    titleEl.dispatchEvent(new Event('input', { bubbles: true }));
                }
            },
            captureBefore: () => document.querySelectorAll('.event-item').length,
            verify: (before) => document.querySelectorAll('.event-item').length > before,
            verifyError: 'The deadline wasn\'t added. Make sure a title is entered.',
            title: '➕ Add a Deadline',
            text: 'Give it a title, an optional time, and an optional description. Click <strong>Add Deadline</strong> to save.',
            hint: 'Click Add Deadline to continue.'
        },
        {
            id: 'nav-notes',
            page: 'calendar',
            type: 'action',
            target: '.app-sidebar .nav-item[data-page="notes"]',
            waitForClick: '.app-sidebar .nav-item[data-page="notes"]',
            verify: () => document.getElementById('pageTitle').textContent.toLowerCase() === 'notes',
            verifyError: 'Navigation didn\'t happen. Click Notes in the sidebar.',
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
            verify: () => document.getElementById('pageTitle').textContent.toLowerCase() === 'profile',
            verifyError: 'Navigation didn\'t happen. Click Profile in the sidebar.',
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
    let clickWatcher = null;
    let repositionPending = false;

    // -------------------------------------------------------------
    //  TUTORIAL-SEEN FLAG  (stored on the user record)
    //  Deleting the account wipes the flag automatically, so
    //  re-registering the same username fires the tour again.
    // -------------------------------------------------------------
    function hasSeenTutorial(username) {
        if (!username) return false;
        if (!window.getUsers) {
            // Fallback if app.js hasn't loaded: use a namespaced localStorage key
            return localStorage.getItem('tutorial_seen_' + username) === 'true';
        }
        const users = window.getUsers();
        const user = users[username];
        return !!(user && user.tutorialSeen === true);
    }

    function markTutorialSeen(username) {
        if (!username) return;
        if (!window.getUsers || !window.saveUsers) {
            localStorage.setItem('tutorial_seen_' + username, 'true');
            return;
        }
        const users = window.getUsers();
        if (!users[username]) users[username] = { username: username };
        users[username].tutorialSeen = true;
        window.saveUsers(users);
    }

    function clearTutorialFlag(username) {
        if (!username) return;
        // Clear on the user record...
        if (window.getUsers && window.saveUsers) {
            const users = window.getUsers();
            if (users[username]) {
                delete users[username].tutorialSeen;
                window.saveUsers(users);
            }
        }
        // ...and clear any stale legacy key from earlier versions
        localStorage.removeItem('tutorial_seen_' + username);
    }

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
    function resolveTarget(step) {
        const sel = resolveSelector(step.target);
        return sel ? document.querySelector(sel) : null;
    }
    function resolveClick(step) { return resolveSelector(step.waitForClick); }

    // -------------------------------------------------------------
    //  DOM  (injected once)
    // -------------------------------------------------------------
    function ensureDom() {
        if (domReady) return;
        if (document.getElementById('tutTooltip')) { domReady = true; return; }

        const frag = document.createElement('div');
        frag.innerHTML = `
            <div class="tut-overlay" id="tutOverlay"></div>
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
                <div class="tt-error" id="ttError"></div>
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
    //  MASKS
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

        setBox(top,    0,     0,     vw, Math.max(0, y));
        setBox(bottom, 0,     y + h, vw, Math.max(0, vh - (y + h)));
        setBox(left,   0,     y,     Math.max(0, x), h);
        setBox(right,  x + w, y,     Math.max(0, vw - (x + w)), h);

        [top, bottom, left, right].forEach(p => p.classList.add('active'));
    }

    function setBox(el, left, top, width, height) {
        el.style.left = left + 'px';
        el.style.top = top + 'px';
        el.style.width = width + 'px';
        el.style.height = height + 'px';
    }

    function hideMasks() {
        ['tutMaskTop', 'tutMaskBottom', 'tutMaskLeft', 'tutMaskRight']
            .forEach(id => document.getElementById(id)?.classList.remove('active'));
        document.getElementById('tutOverlay')?.classList.remove('active');
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

    function showVerifyError(msg) {
        const el = document.getElementById('ttError');
        if (!el) return;
        el.textContent = msg;
        el.classList.add('active');
        setTimeout(() => el.classList.remove('active'), 4500);
    }

    function setTooltipContent(step) {
        document.getElementById('ttTitle').textContent = step.title;
        document.getElementById('ttText').innerHTML = step.text;
        document.getElementById('ttStepNow').textContent = idx + 1;
        document.getElementById('ttError').classList.remove('active');

        const hintEl = document.getElementById('ttHint');
        if (hintEl) {
            hintEl.textContent = step.hint || '';
            hintEl.style.display = step.hint ? 'block' : 'none';
        }

        const nextBtn = document.getElementById('ttNext');
        const isAction = step.type === 'action';
        if (isAction) {
            nextBtn.style.display = 'none';
        } else {
            nextBtn.style.display = '';
            nextBtn.textContent = step.nextText || (idx === STEPS.length - 1 ? 'Finish Tour' : 'Next');
            nextBtn.className = idx === STEPS.length - 1 ? 'tt-next done' : 'tt-next';
        }
    }

    // -------------------------------------------------------------
    //  ARROW  (all inline)
    // -------------------------------------------------------------
    function positionArrow(targetCenterX, dir) {
        const arrow = document.getElementById('ttArrow');
        const tooltip = document.getElementById('tutTooltip');
        if (!arrow || !tooltip) return;

        arrow.style.position = 'absolute';
        arrow.style.width = '0';
        arrow.style.height = '0';
        arrow.style.borderLeft = '12px solid transparent';
        arrow.style.borderRight = '12px solid transparent';

        if (dir === 'top') {
            arrow.style.top = '-14px';
            arrow.style.bottom = 'auto';
            arrow.style.borderTop = 'none';
            arrow.style.borderBottom = '12px solid #4f46e5';
        } else {
            arrow.style.top = 'auto';
            arrow.style.bottom = '-14px';
            arrow.style.borderTop = '12px solid #4f46e5';
            arrow.style.borderBottom = 'none';
        }

        const tRect = tooltip.getBoundingClientRect();
        const arrowHalf = 12;
        const borderW = 2;
        let arrowLeft = targetCenterX - tRect.left - borderW - arrowHalf;

        const min = 20;
        const max = tRect.width - 40;
        if (arrowLeft < min) arrowLeft = min;
        if (arrowLeft > max) arrowLeft = max;

        arrow.style.left = arrowLeft + 'px';
        arrow.style.transform = 'none';
    }

    // -------------------------------------------------------------
    //  POSITION EVERYTHING
    // -------------------------------------------------------------
    function positionAll(step, targetEl) {
        const tooltip = document.getElementById('tutTooltip');
        const highlight = document.getElementById('tutHighlight');
        const overlay = document.getElementById('tutOverlay');
        if (!tooltip || !highlight || !overlay) return;

        tooltip.classList.remove('centered');
        highlight.classList.remove('active');
        highlight.style.display = 'none';
        hideMasks();

        if (!targetEl) {
            overlay.classList.add('active');
            tooltip.style.left = '50%';
            tooltip.style.top = '50%';
            tooltip.style.transform = 'translate(-50%, -50%)';
            tooltip.classList.add('active', 'centered');
            return;
        }

        const rect = targetEl.getBoundingClientRect();
        const pad = 8;

        highlight.style.left = (rect.left - pad) + 'px';
        highlight.style.top = (rect.top - pad) + 'px';
        highlight.style.width = (rect.width + pad * 2) + 'px';
        highlight.style.height = (rect.height + pad * 2) + 'px';
        highlight.classList.add('active');
        highlight.style.display = 'block';

        positionMasks(rect, pad);

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const tipW = 420;
        const tipH = tooltip.offsetHeight || 260;

        let ttLeft = rect.left + rect.width / 2 - tipW / 2;
        let ttTop  = rect.bottom + 22;
        let arrowDir = 'top';

        if (ttTop + tipH > vh - 10) {
            ttTop = rect.top - tipH - 22;
            arrowDir = 'bottom';
        }
        if (ttTop < 10) {
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
        tooltip.classList.add('active');

        const targetCenterX = rect.left + rect.width / 2;
        positionArrow(targetCenterX, arrowDir);

        if (rect.top < 0 || rect.bottom > vh) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    function renderTooltip(step, targetEl) {
        setTooltipContent(step);
        positionAll(step, targetEl);
    }

    function scheduleReposition() {
        if (!active) return;
        if (repositionPending) return;
        repositionPending = true;
        requestAnimationFrame(() => {
            repositionPending = false;
            const step = STEPS[idx];
            if (!step) return;
            const targetEl = resolveTarget(step);
            positionAll(step, targetEl);
        });
    }

    // -------------------------------------------------------------
    //  ACTION STEP
    // -------------------------------------------------------------
    function attachClickWatcher(step) {
        const sel = resolveClick(step);
        if (!sel) return;

        detachClickWatcher();

        const beforeSnapshot = step.captureBefore ? step.captureBefore() : null;

        clickWatcher = {
            verifying: false,
            handler: async function (e) {
                const hit = e.target.closest(sel);
                if (!hit) return;
                if (clickWatcher.verifying) return;
                clickWatcher.verifying = true;

                await sleep(180);

                if (step.verify) {
                    let ok = false;
                    try {
                        ok = await step.verify(beforeSnapshot);
                    } catch (err) {
                        console.warn('[tutorial] verify threw:', err);
                        ok = false;
                    }
                    if (!ok) {
                        showVerifyError(step.verifyError || 'That didn\'t work — please try again.');
                        clickWatcher.verifying = false;
                        return;
                    }
                }

                if (step.expectAfter) {
                    const el = await waitFor(step.expectAfter, step.verifyTimeout || 2500);
                    if (!el) {
                        showVerifyError(step.verifyError || 'That didn\'t work — please try again.');
                        clickWatcher.verifying = false;
                        return;
                    }
                }

                detachClickWatcher();
                advance();
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
            // Wipe the flag so the tour will be shown again next time
            clearTutorialFlag(currentTutUser);
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
            // Store on the user record so account deletion resets it
            markTutorialSeen(currentTutUser);
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

        if (step.prefill) {
            try { step.prefill(); } catch (e) { console.warn('[tutorial] prefill failed:', e); }
        }

        await sleep(120);
        const targetEl = resolveTarget(step);

        if (step.target && !targetEl && step.type === 'action') {
            console.warn(`[tutorial] Skipping "${step.id}": target "${resolveSelector(step.target)}" not found`);
            return advance();
        }
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

    document.addEventListener('scroll', scheduleReposition, { passive: true, capture: true });
    window.addEventListener('resize', scheduleReposition);

    document.addEventListener('keydown', function (e) {
        if (!active) return;
        if (e.key === 'Escape') {
            if (confirm('Close the tour?')) finish();
        }
    });

    // -------------------------------------------------------------
    //  BOOT  — auto-start for brand-new accounts
    // -------------------------------------------------------------
    function boot() {
        currentTutUser = localStorage.getItem('currentUser');
        if (!currentTutUser) return;

        ensureDom();

        if (hasSeenTutorial(currentTutUser)) {
            console.log('[tutorial] User has already seen the tour. Use the "?" button to replay.');
            return;
        }

        console.log('[tutorial] New user detected — waiting for dashboard to be ready...');

        let started = false;
        const go = (reason) => {
            if (started) return;
            started = true;
            console.log('[tutorial] Starting tour (' + reason + ')');
            setTimeout(() => start(false), 300);
        };

        const isDashboardReady = () => {
            const titleEl = document.getElementById('pageTitle');
            const container = document.getElementById('pageContainer');
            return titleEl
                && titleEl.textContent.trim().toLowerCase() === 'dashboard'
                && container
                && container.children.length > 0
                && container.querySelector('.dashboard-page, .stats-grid');
        };

        if (isDashboardReady()) {
            go('dashboard already rendered');
            return;
        }

        const onDashboardLoaded = function (e) {
            if (!e.detail || e.detail.page !== 'dashboard') return;
            document.removeEventListener('pageLoaded', onDashboardLoaded);
            go('dashboard loaded event');
        };
        document.addEventListener('pageLoaded', onDashboardLoaded);

        setTimeout(() => go('safety timeout'), 3000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    window.startTutorial = () => start(true);
    window.skipTutorial = skipTour;

})();
