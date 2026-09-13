// =============================================================
//  NOTES PAGE
//  Notes are stored on the user record at:
//      users[currentUser].notes
//  so the Profile page's Export / Import handles them
//  automatically.
// =============================================================
(function () {

    const SESSION_KEY = 'currentUser';
    const AUTOSAVE_DELAY_MS = 800;

    let currentNotesUser = null;
    let autosaveTimer = null;
    let lastSavedContent = '';

    // ============================================================
    //  STORAGE  (uses the shared user registry from app.js)
    // ============================================================
    function getSessionUser() {
        return localStorage.getItem(SESSION_KEY);
    }

    function readNotes() {
        if (!window.getUsers) return '';
        const users = window.getUsers();
        const user = users[currentNotesUser];
        return (user && typeof user.notes === 'string') ? user.notes : '';
    }

    function writeNotes(text) {
        if (!window.getUsers || !window.saveUsers) return false;
        const users = window.getUsers();
        if (!users[currentNotesUser]) {
            users[currentNotesUser] = { username: currentNotesUser };
        }
        users[currentNotesUser].notes = text;
        window.saveUsers(users);
        return true;
    }

    // ============================================================
    //  UI HELPERS
    // ============================================================
    function setStatus(msg, type) {
        const el = document.getElementById('notesStatus');
        if (!el) return;
        el.textContent = msg;
        el.className = 'notes-status ' + (type || '');
    }

    function clearStatus() {
        const el = document.getElementById('notesStatus');
        if (!el) return;
        el.textContent = '';
        el.className = 'notes-status';
    }

    function updateCharCount() {
        const ta = document.getElementById('notesTextarea');
        const counter = document.getElementById('notesCharCount');
        if (!ta || !counter) return;
        const n = ta.value.length;
        counter.textContent = n + (n === 1 ? ' character' : ' characters');
    }

    function updateSavedAt(date) {
        const el = document.getElementById('notesSavedAt');
        if (!el) return;
        if (!date) { el.textContent = 'Not saved yet'; return; }
        el.textContent = 'Saved at ' + date.toLocaleTimeString([], {
            hour: '2-digit', minute: '2-digit'
        });
    }

    // ============================================================
    //  SAVE / CLEAR
    // ============================================================
    function saveNotes(silent) {
        const ta = document.getElementById('notesTextarea');
        if (!ta) return;

        const text = ta.value;
        const ok = writeNotes(text);

        if (!ok) {
            setStatus('❌ Could not save notes.', 'error');
            return;
        }

        lastSavedContent = text;
        const now = new Date();
        updateSavedAt(now);

        if (!silent) {
            setStatus('✅ Notes saved', 'success');
            setTimeout(() => {
                if (document.getElementById('notesStatus')?.textContent === '✅ Notes saved') {
                    clearStatus();
                }
            }, 2000);
        }
    }

    function clearNotes() {
        if (!confirm('Clear all notes? This cannot be undone.')) return;
        const ta = document.getElementById('notesTextarea');
        if (!ta) return;
        ta.value = '';
        lastSavedContent = '';
        writeNotes('');
        updateCharCount();
        updateSavedAt(null);
        setStatus('🗑️ Notes cleared', 'info');
        ta.focus();
        setTimeout(clearStatus, 2000);
    }

    // ============================================================
    //  AUTO-SAVE
    // ============================================================
    function scheduleAutosave() {
        if (autosaveTimer) clearTimeout(autosaveTimer);
        autosaveTimer = setTimeout(() => {
            const ta = document.getElementById('notesTextarea');
            if (!ta) return;
            if (ta.value === lastSavedContent) return;
            saveNotes(true);
            setStatus('💾 Autosaved', 'info');
            setTimeout(() => {
                if (document.getElementById('notesStatus')?.textContent === '💾 Autosaved') {
                    clearStatus();
                }
            }, 1500);
        }, AUTOSAVE_DELAY_MS);
    }

    // ============================================================
    //  LOAD
    // ============================================================
    function loadNotes() {
        const ta = document.getElementById('notesTextarea');
        if (!ta) return;

        const saved = readNotes();
        ta.value = saved;
        lastSavedContent = saved;

        updateCharCount();

        if (saved) {
            updateSavedAt(new Date());
        } else {
            updateSavedAt(null);
        }
    }

    // ============================================================
    //  BINDING  (clone-before-bind to avoid stacking listeners)
    // ============================================================
    function bindNotesEvents() {
        // Textarea input → autosave + char count
        const ta = document.getElementById('notesTextarea');
        if (ta) {
            const fresh = ta.cloneNode(true);
            ta.parentNode.replaceChild(fresh, ta);
            fresh.addEventListener('input', function () {
                updateCharCount();
                scheduleAutosave();
            });
            // Ctrl/Cmd + S to force save
            fresh.addEventListener('keydown', function (e) {
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                    e.preventDefault();
                    saveNotes();
                }
            });
        }

        // Save button
        const saveBtn = document.getElementById('saveNotesBtn');
        if (saveBtn) {
            const fresh = saveBtn.cloneNode(true);
            saveBtn.parentNode.replaceChild(fresh, saveBtn);
            fresh.addEventListener('click', function () { saveNotes(false); });
        }

        // Clear button
        const clearBtn = document.getElementById('clearNotesBtn');
        if (clearBtn) {
            const fresh = clearBtn.cloneNode(true);
            clearBtn.parentNode.replaceChild(fresh, clearBtn);
            fresh.addEventListener('click', clearNotes);
        }
    }

    // ============================================================
    //  INIT
    // ============================================================
    function initNotesPage() {
        currentNotesUser = getSessionUser();
        if (!currentNotesUser) return;

        if (autosaveTimer) { clearTimeout(autosaveTimer); autosaveTimer = null; }

        bindNotesEvents();
        loadNotes();
        clearStatus();
    }

    // Trigger every time app.js loads the notes page
    document.addEventListener('pageLoaded', function (e) {
        if (e.detail && e.detail.page === 'notes') {
            initNotesPage();
        }
    });

    // Fallback for standalone use
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            if (!document.getElementById('pageContainer') && document.getElementById('notesTextarea')) {
                initNotesPage();
            }
        });
    } else {
        if (!document.getElementById('pageContainer') && document.getElementById('notesTextarea')) {
            initNotesPage();
        }
    }

})();