// =============================================================
//  CALENDAR PAGE
//  Shared storage with the rest of the app:
//    session: currentUser
//    data:    app_calendar_<username>
// =============================================================
(function () {

    const SESSION_KEY = 'currentUser';
    const CALENDAR_KEY_PREFIX = 'app_calendar_';

    let currentDate = new Date();        // month being viewed
    let selectedDate = new Date();       // day selected in the grid
    let calendarEvents = {};             // { 'YYYY-MM-DD': [ {id,title,time,description,date}, ... ] }

    // ============================================================
    //  STORAGE
    // ============================================================
    function getSessionUser() {
        return localStorage.getItem(SESSION_KEY);
    }
    function getCalendarKey() {
        return CALENDAR_KEY_PREFIX + getSessionUser();
    }

    function loadCalendarEvents() {
        const key = getCalendarKey();
        const stored = localStorage.getItem(key);
        if (!stored) { calendarEvents = {}; return; }
        try {
            const parsed = JSON.parse(stored);
            calendarEvents = (parsed && typeof parsed === 'object') ? parsed : {};
        } catch (e) {
            console.warn('Could not parse calendar; resetting.', e);
            calendarEvents = {};
        }
    }

    function saveCalendarEvents() {
        localStorage.setItem(getCalendarKey(), JSON.stringify(calendarEvents));
    }

    // ============================================================
    //  HELPERS
    // ============================================================
    function toDateKey(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    // ============================================================
    //  RENDER
    // ============================================================
    function renderCalendar() {
        const grid = document.getElementById('calendarGrid');
        const label = document.getElementById('calendarMonthYear');
        if (!grid) return;

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        if (label) {
            label.textContent = new Date(year, month).toLocaleDateString('en-US', {
                month: 'long', year: 'numeric'
            });
        }

        const firstDay = new Date(year, month, 1).getDay();   // 0 = Sun
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        const today = new Date();
        const todayKey = toDateKey(today);
        const selectedKey = toDateKey(selectedDate);

        let html = '';
        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(name => {
            html += `<div class="day-name">${name}</div>`;
        });

        // Leading days from previous month
        for (let i = firstDay - 1; i >= 0; i--) {
            html += `<div class="day-cell other-month">${daysInPrevMonth - i}</div>`;
        }

        // Days of current month
        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj = new Date(year, month, d);
            const key = toDateKey(dateObj);
            const isToday = key === todayKey;
            const isSelected = key === selectedKey;
            const hasEvent = Array.isArray(calendarEvents[key]) && calendarEvents[key].length > 0;

            let classes = 'day-cell';
            if (isToday) classes += ' today';
            if (isSelected) classes += ' selected';

            html += `
                <div class="${classes}" data-date="${key}">
                    ${d}
                    ${hasEvent ? '<div class="event-dot"></div>' : ''}
                </div>`;
        }

        // Trailing days from next month
        const totalCells = firstDay + daysInMonth;
        const trailing = (7 - (totalCells % 7)) % 7;
        for (let d = 1; d <= trailing; d++) {
            html += `<div class="day-cell other-month">${d}</div>`;
        }

        grid.innerHTML = html;

        // Refresh the selected-day panel
        renderEventList();
        updateSelectedDateDisplay();
    }

    function updateSelectedDateDisplay() {
        const display = selectedDate.toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
        });
        const h = document.getElementById('selectedDateDisplay');
        const f = document.getElementById('selectedDateFormDisplay');
        if (h) h.textContent = `📅 Deadlines for ${display}`;
        if (f) f.textContent = display;
    }

    function renderEventList() {
        const container = document.getElementById('eventList');
        if (!container) return;

        const key = toDateKey(selectedDate);
        const events = calendarEvents[key] || [];

        if (events.length === 0) {
            container.innerHTML = `<p class="no-events">No deadlines for this day.</p>`;
            return;
        }

        // Sort by time (undefined times go last)
        const sorted = [...events].sort((a, b) => {
            if (!a.time && !b.time) return 0;
            if (!a.time) return 1;
            if (!b.time) return -1;
            return a.time.localeCompare(b.time);
        });

        container.innerHTML = sorted.map(ev => {
            const parts = [];
            if (ev.time) parts.push(`<span><i class="far fa-clock"></i>${escapeHtml(ev.time)}</span>`);
            if (ev.description) parts.push(`<span><i class="far fa-sticky-note"></i>${escapeHtml(ev.description)}</span>`);
            return `
                <div class="event-item">
                    <div class="event-details">
                        <strong>${escapeHtml(ev.title)}</strong>
                        ${parts.length ? `<div class="event-meta">${parts.join('')}</div>` : ''}
                    </div>
                    <button class="delete-event" data-event-id="${ev.id}" title="Delete">
                        <i class="fas fa-times"></i>
                    </button>
                </div>`;
        }).join('');
    }

    // ============================================================
    //  ACTIONS
    // ============================================================
    function changeMonth(delta) {
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1);
        renderCalendar();
    }

    function selectDateFromKey(key) {
        const [y, m, d] = key.split('-').map(Number);
        selectedDate = new Date(y, m - 1, d);
        renderCalendar();
    }

    function addEvent() {
        const titleEl = document.getElementById('newEventTitle');
        const timeEl = document.getElementById('newEventTime');
        const descEl = document.getElementById('newEventDesc');
        if (!titleEl) return;

        const title = titleEl.value.trim();
        const time = timeEl ? timeEl.value : '';
        const desc = descEl ? descEl.value.trim() : '';

        if (!title) {
            alert('Please enter a title for the deadline.');
            titleEl.focus();
            return;
        }

        const key = toDateKey(selectedDate);
        if (!calendarEvents[key]) calendarEvents[key] = [];

        calendarEvents[key].push({
            id: Date.now(),
            title,
            time,
            description: desc,
            date: key
        });

        saveCalendarEvents();

        // Reset the form
        titleEl.value = '';
        if (timeEl) timeEl.value = '';
        if (descEl) descEl.value = '';

        renderCalendar();
    }

    function deleteEvent(eventId) {
        const key = toDateKey(selectedDate);
        const events = calendarEvents[key];
        if (!Array.isArray(events)) return;

        calendarEvents[key] = events.filter(e => String(e.id) !== String(eventId));
        if (calendarEvents[key].length === 0) delete calendarEvents[key];

        saveCalendarEvents();
        renderCalendar();
    }

    // ============================================================
    //  BINDING
    // ============================================================
    function bindCalendarEvents() {
        // Previous / next month — clone to prevent duplicate listeners
        const prev = document.getElementById('prevMonthBtn');
        if (prev) {
            const fresh = prev.cloneNode(true);
            prev.parentNode.replaceChild(fresh, prev);
            fresh.addEventListener('click', () => changeMonth(-1));
        }

        const next = document.getElementById('nextMonthBtn');
        if (next) {
            const fresh = next.cloneNode(true);
            next.parentNode.replaceChild(fresh, next);
            fresh.addEventListener('click', () => changeMonth(1));
        }

        // Grid click — event delegation on the grid
        const grid = document.getElementById('calendarGrid');
        if (grid) {
            const fresh = grid.cloneNode(true);
            grid.parentNode.replaceChild(fresh, grid);
            fresh.addEventListener('click', function (e) {
                const cell = e.target.closest('.day-cell');
                if (!cell || cell.classList.contains('other-month')) return;
                const key = cell.dataset.date;
                if (key) selectDateFromKey(key);
            });
        }

        // Event list — delete buttons via delegation
        const list = document.getElementById('eventList');
        if (list) {
            const fresh = list.cloneNode(true);
            list.parentNode.replaceChild(fresh, list);
            fresh.addEventListener('click', function (e) {
                const btn = e.target.closest('.delete-event');
                if (!btn) return;
                if (confirm('Delete this deadline?')) {
                    deleteEvent(btn.dataset.eventId);
                }
            });
        }

        // Add event button
        const addBtn = document.getElementById('addEventBtn');
        if (addBtn) {
            const fresh = addBtn.cloneNode(true);
            addBtn.parentNode.replaceChild(fresh, addBtn);
            fresh.addEventListener('click', addEvent);
        }

        // Enter key submits from the title input
        const titleInput = document.getElementById('newEventTitle');
        if (titleInput) {
            const fresh = titleInput.cloneNode(true);
            titleInput.parentNode.replaceChild(fresh, titleInput);
            fresh.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') addEvent();
            });
        }
    }

    // ============================================================
    //  INIT
    // ============================================================
    function initCalendarPage() {
        const user = getSessionUser();
        if (!user) return;

        loadCalendarEvents();

        // Reset view to current month/today each time we visit
        currentDate = new Date();
        selectedDate = new Date();

        bindCalendarEvents();
        renderCalendar();
    }

    // Trigger every time app.js loads the calendar page
    document.addEventListener('pageLoaded', function (e) {
        if (e.detail && e.detail.page === 'calendar') {
            initCalendarPage();
        }
    });

    // Fallback for standalone use
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            if (!document.getElementById('pageContainer') && document.getElementById('calendarGrid')) {
                initCalendarPage();
            }
        });
    } else {
        if (!document.getElementById('pageContainer') && document.getElementById('calendarGrid')) {
            initCalendarPage();
        }
    }

})();
