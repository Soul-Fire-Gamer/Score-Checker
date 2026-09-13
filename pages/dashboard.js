// =============================================================
//  DASHBOARD PAGE  —  stats + add-subject + full subject detail
//  Wrapped in an IIFE so it doesn't collide with subjects.js
// =============================================================
(function () {

    const STORAGE_KEYS = {
        USER_DATA: 'academicData_',
        SESSION: 'currentUser'
    };

    const WEIGHTS = { EXAM: 0.30, Q1: 0.175, Q2: 0.175, Q3: 0.175, Q4: 0.175 };

    let subjects = [];
    let selectedSubjectId = null;
    let selectedPeriod = 'Q1';

    // ============================================================
    //  SESSION / PERSISTENCE  (shared with Subjects page)
    // ============================================================
    function getSessionUser() {
        return localStorage.getItem(STORAGE_KEYS.SESSION);
    }
    function getDataKey() {
        return STORAGE_KEYS.USER_DATA + getSessionUser();
    }

    function loadUserSubjects() {
        const stored = localStorage.getItem(getDataKey());
        const parsed = stored ? JSON.parse(stored) : null;
        let subs;
        if (Array.isArray(parsed)) subs = parsed;
        else if (parsed && Array.isArray(parsed.subjects)) subs = parsed.subjects;
        else subs = [];

        // Normalize each subject so older entries work with the detail view
        subs.forEach(s => {
            if (!s.quarters) {
                s.quarters = {
                    q1: { minor: [], major: [], manualAverage: null },
                    q2: { minor: [], major: [], manualAverage: null },
                    q3: { minor: [], major: [], manualAverage: null },
                    q4: { minor: [], major: [], manualAverage: null }
                };
            } else {
                ['q1', 'q2', 'q3', 'q4'].forEach(q => {
                    if (!s.quarters[q]) s.quarters[q] = { minor: [], major: [], manualAverage: null };
                    if (s.quarters[q].manualAverage === undefined) s.quarters[q].manualAverage = null;
                    if (!Array.isArray(s.quarters[q].minor)) s.quarters[q].minor = [];
                    if (!Array.isArray(s.quarters[q].major)) s.quarters[q].major = [];
                });
            }
            if (!s.averages) s.averages = { q1: 0, q2: 0, q3: 0, q4: 0, semester1: 0, semester2: 0, total: 0 };
            if (!s.grades) s.grades = { q1: 'N/A', q2: 'N/A', q3: 'N/A', q4: 'N/A', semester1: 'N/A', semester2: 'N/A', total: 'N/A' };
            if (s.finalExam === undefined) s.finalExam = null;
            calculateSubjectAverages(s);
            calculateWeightedTotal(s);
        });
        return subs;
    }

    function saveUserSubjects(subs) {
        localStorage.setItem(getDataKey(), JSON.stringify({ subjects: subs }));
    }

    // ============================================================
    //  CALCULATIONS  (identical to subjects.js so numbers match)
    // ============================================================
    function calculateAverage(assignments) {
        if (!assignments || assignments.length === 0) return 0;
        return assignments.reduce((sum, a) => sum + parseFloat(a.percentage), 0) / assignments.length;
    }

    function getGrade(percentage) {
        const p = parseFloat(percentage);
        if (p === 0 || isNaN(p)) return 'N/A';
        if (p >= 90) return 'A';
        if (p >= 80) return 'B';
        if (p >= 70) return 'C';
        if (p >= 60) return 'D';
        return 'F';
    }

    function getGradeClass(grade) {
        return 'grade-' + (grade === 'N/A' ? 'grade-NA' : grade);
    }

    function calculateSubjectAverages(subject) {
        ['q1', 'q2', 'q3', 'q4'].forEach(q => {
            const qd = subject.quarters[q];
            if (qd.manualAverage !== null && qd.manualAverage !== undefined) {
                subject.averages[q] = qd.manualAverage;
            } else {
                const minorAvg = calculateAverage(qd.minor);
                const majorAvg = calculateAverage(qd.major);
                if (minorAvg > 0 && majorAvg > 0) subject.averages[q] = minorAvg * 0.4 + majorAvg * 0.6;
                else if (minorAvg > 0) subject.averages[q] = minorAvg;
                else if (majorAvg > 0) subject.averages[q] = majorAvg;
                else subject.averages[q] = 0;
            }
            subject.grades[q] = getGrade(subject.averages[q]);
        });
        subject.averages.semester1 = (subject.averages.q1 + subject.averages.q2) / 2 || 0;
        subject.averages.semester2 = (subject.averages.q3 + subject.averages.q4) / 2 || 0;
        subject.grades.semester1 = getGrade(subject.averages.semester1);
        subject.grades.semester2 = getGrade(subject.averages.semester2);
    }

    function calculateWeightedTotal(subject) {
        const exam = subject.finalExam ? parseFloat(subject.finalExam.percentage) : 0;
        const total =
            exam * WEIGHTS.EXAM +
            (subject.averages.q1 || 0) * WEIGHTS.Q1 +
            (subject.averages.q2 || 0) * WEIGHTS.Q2 +
            (subject.averages.q3 || 0) * WEIGHTS.Q3 +
            (subject.averages.q4 || 0) * WEIGHTS.Q4;
        subject.averages.total = parseFloat(total.toFixed(1));
        subject.grades.total = getGrade(subject.averages.total);
    }

    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    // ============================================================
    //  STATS  (top cards)
    // ============================================================
    function updateStats() {
        let totalAvg = 0, sem1Avg = 0, sem2Avg = 0, withScores = 0, sem1Count = 0, sem2Count = 0;

        subjects.forEach(s => {
            if (s.averages.total > 0) { totalAvg += s.averages.total; withScores++; }
            if (s.averages.semester1 > 0) { sem1Avg += s.averages.semester1; sem1Count++; }
            if (s.averages.semester2 > 0) { sem2Avg += s.averages.semester2; sem2Count++; }
        });

        totalAvg = withScores ? (totalAvg / withScores) : 0;
        sem1Avg = sem1Count ? (sem1Avg / sem1Count) : 0;
        sem2Avg = sem2Count ? (sem2Avg / sem2Count) : 0;

        document.getElementById('totalAverage').textContent = totalAvg.toFixed(1) + '%';
        document.getElementById('semester1Avg').textContent = sem1Avg.toFixed(1) + '%';
        document.getElementById('semester2Avg').textContent = sem2Avg.toFixed(1) + '%';
        document.getElementById('totalSubjects').textContent = subjects.length;
    }

    // ============================================================
    //  SUBJECT LIST  (left sidebar)
    // ============================================================
    function renderSubjectsList() {
        const container = document.getElementById('subjectsList');
        if (!container) return;

        if (subjects.length === 0) {
            container.innerHTML = '<div class="empty-state">No subjects yet</div>';
            return;
        }

        container.innerHTML = subjects.map(s => {
            const isActive = s.id === selectedSubjectId;
            const gradeClass = getGradeClass(s.grades.total);
            const hasExam = s.finalExam !== null;
            return `
                <div class="subject-card ${isActive ? 'active' : ''}" data-id="${s.id}">
                    <div class="subject-card-top">
                        <div class="subject-name">${escapeHtml(s.name)}</div>
                        <span class="grade-badge ${gradeClass}">${s.grades.total}</span>
                    </div>
                    <div class="subject-card-meta">
                        <span>Avg: <strong>${s.averages.total.toFixed(1)}%</strong></span>
                        <span>${hasExam ? '📝' : ''}</span>
                    </div>
                </div>`;
        }).join('');
    }

    function countAssignments(s) {
        return ['q1', 'q2', 'q3', 'q4'].reduce((sum, q) =>
            sum + s.quarters[q].minor.length + s.quarters[q].major.length, 0);
    }

    // ============================================================
    //  SUBJECT DETAIL  (right main panel)
    // ============================================================
    function renderDetail() {
        const container = document.getElementById('subjectDetail');
        if (!container) return;

        if (!selectedSubjectId) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-hand-pointer"></i>
                    <h2>Select a Subject</h2>
                    <p>Choose a subject to view its quarters, assignments, and scores.</p>
                </div>`;
            return;
        }

        const subject = subjects.find(s => s.id === selectedSubjectId);
        if (!subject) return;

        const quarterKey = selectedPeriod.toLowerCase();
        const isQuarter = ['q1', 'q2', 'q3', 'q4'].includes(quarterKey);
        const isExam = selectedPeriod === 'Final Exam';

        const periods = ['Q1', 'Q2', 'Q3', 'Q4', '📝 Final Exam', 'S1', 'S2', 'Total'];
        const periodTabs = periods.map(p => {
            const active = (selectedPeriod === p || (p === '📝 Final Exam' && isExam)) ? 'active' : '';
            const val = p === '📝 Final Exam' ? 'Final Exam' : p;
            return `<div class="period-tab ${active}" data-period="${val}">${p}</div>`;
        }).join('');

        const header = `
            <h2 class="detail-title">
                <i class="fas fa-book"></i> ${escapeHtml(subject.name)}
            </h2>`;

        // ---------- FINAL EXAM ----------
        if (isExam) {
            const exam = subject.finalExam;
            const hasExam = exam !== null;
            const weightPercent = (WEIGHTS.EXAM * 100).toFixed(0);

            const examDisplay = hasExam
                ? `<div class="exam-display">
                       <div>
                           <div class="exam-label">📝 Final Exam</div>
                           <div class="exam-sub">Added: ${exam.date}</div>
                       </div>
                       <div>
                           <span class="exam-score">${exam.score}/${exam.max} (${exam.percentage}%)</span>
                           <span class="grade-badge ${getGradeClass(getGrade(exam.percentage))}">${getGrade(exam.percentage)}</span>
                       </div>
                       <button class="btn btn-red btn-sm" data-action="delete-exam">
                           <i class="fas fa-trash"></i> Remove
                       </button>
                   </div>`
                : `<div class="info-box"><i class="fas fa-clipboard"></i><p>No final exam added yet.</p></div>`;

            container.innerHTML = `
                ${header}
                <div class="summary-grid">
                    <div class="summary-card">
                        <div class="value">${hasExam ? exam.percentage + '%' : 'N/A'}</div>
                        <div class="label">Final Exam (${weightPercent}% of Total)</div>
                    </div>
                    <div class="summary-card">
                        <div class="value">${hasExam ? '✅ Set' : '❌ Not Set'}</div>
                        <div class="label">Status</div>
                    </div>
                </div>
                <div class="period-tabs">${periodTabs}</div>
                <div class="exam-panel">
                    <h3>${hasExam ? 'Update Final Exam' : 'Add Final Exam'}</h3>
                    <p>The final exam counts for ${weightPercent}% of your total grade.</p>
                    <div class="form-grid">
                        <div class="field">
                            <label>Score</label>
                            <input type="number" id="examScore" placeholder="Score" step="0.1" min="0" value="${hasExam ? exam.score : ''}" />
                        </div>
                        <div class="field">
                            <label>Maximum</label>
                            <input type="number" id="examMax" placeholder="100" value="${hasExam ? exam.max : '100'}" step="0.1" min="1" />
                        </div>
                    </div>
                    <button class="add-btn" data-action="save-exam">
                        <i class="fas fa-save"></i> ${hasExam ? 'Update' : 'Add'} Final Exam
                    </button>
                </div>
                <h3 class="section-h3">Current Final Exam</h3>
                ${examDisplay}`;

            document.querySelector('[data-action="save-exam"]').addEventListener('click', setFinalExam);
            const delBtn = document.querySelector('[data-action="delete-exam"]');
            if (delBtn) delBtn.addEventListener('click', deleteFinalExam);
            return;
        }

        // ---------- QUARTER ----------
        if (isQuarter) {
            const allAssignments = [
                ...subject.quarters[quarterKey].minor.map(a => ({ ...a, type: 'minor' })),
                ...subject.quarters[quarterKey].major.map(a => ({ ...a, type: 'major' }))
            ].sort((a, b) => b.id - a.id);

            const totalAssignments = allAssignments.length;
            const totalPct = allAssignments.reduce((sum, a) => sum + parseFloat(a.percentage), 0);
            const avgDisplay = totalAssignments > 0 ? (totalPct / totalAssignments).toFixed(1) : 'N/A';
            const weightPercent = (WEIGHTS[quarterKey.toUpperCase()] * 100).toFixed(1);

            let tableRows;
            if (allAssignments.length === 0) {
                tableRows = `<tr><td colspan="7" class="table-empty">
                    ${subject.quarters[quarterKey].manualAverage !== null
                        ? 'Manual average set. Add assignments to switch to assignment-based calculation.'
                        : 'No assignments yet.'}
                </td></tr>`;
            } else {
                tableRows = allAssignments.map(a => {
                    const typeClass = a.type === 'minor' ? 'type-minor' : 'type-major';
                    return `
                        <tr>
                            <td>${escapeHtml(a.name)}</td>
                            <td>${a.score}/${a.max}</td>
                            <td>${a.percentage}%</td>
                            <td><span class="type-badge ${typeClass}">${a.type === 'minor' ? 'Minor' : 'Major'}</span></td>
                            <td>${getGrade(a.percentage)}</td>
                            <td>${a.date}</td>
                            <td>
                                <div class="assignment-actions">
                                    <button class="btn btn-blue btn-xs"
                                        data-action="edit-assignment" data-quarter="${quarterKey}"
                                        data-type="${a.type}" data-id="${a.id}">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-red btn-xs"
                                        data-action="delete-assignment" data-quarter="${quarterKey}"
                                        data-type="${a.type}" data-id="${a.id}">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>`;
                }).join('');
            }

            const manualActive = subject.quarters[quarterKey].manualAverage !== null;

            container.innerHTML = `
                ${header}
                <div class="summary-grid">
                    <div class="summary-card">
                        <div class="value">${subject.averages[quarterKey].toFixed(1)}%</div>
                        <div class="label">${selectedPeriod} Avg (${weightPercent}% of Total)</div>
                        <span class="grade-badge ${getGradeClass(subject.grades[quarterKey])}">${subject.grades[quarterKey]}</span>
                    </div>
                    <div class="summary-card">
                        <div class="value">${totalAssignments}</div>
                        <div class="label">Assignments</div>
                    </div>
                    <div class="summary-card">
                        <div class="value">${manualActive ? 'Manual' : 'Auto'}</div>
                        <div class="label">Type</div>
                    </div>
                </div>
                <div class="period-tabs">${periodTabs}</div>

                ${manualActive ? `
                    <div class="average-setter">
                        <div class="manual-active-row">
                            <span>Manual avg active: <strong>${subject.quarters[quarterKey].manualAverage}%</strong></span>
                            <button class="btn btn-red btn-sm" data-action="clear-manual">
                                <i class="fas fa-times"></i> Clear
                            </button>
                        </div>
                    </div>
                ` : `
                    <div class="average-setter">
                        <h3>Set Manual Average</h3>
                        <p>Override the calculated average for this quarter.</p>
                        <div class="avg-input-row">
                            <span>Average:</span>
                            <input type="number" id="manualAverageInput" placeholder="0-100" min="0" max="100" step="0.1">
                            <span class="percent-label">%</span>
                            <button class="btn btn-blue btn-sm" data-action="set-manual">
                                <i class="fas fa-check"></i> Set
                            </button>
                        </div>
                    </div>
                `}

                <div class="assignment-panel">
                    <h3>Add Assignment to ${selectedPeriod}</h3>
                    <div class="form-grid">
                        <div class="field">
                            <label>Name</label>
                            <input type="text" id="assignmentName" placeholder="Quiz, Test..." />
                        </div>
                        <div class="field">
                            <label>Score</label>
                            <input type="number" id="scoreObtained" placeholder="Score" step="0.1" min="0" />
                        </div>
                        <div class="field">
                            <label>Max</label>
                            <input type="number" id="scoreMax" placeholder="100" value="100" step="0.1" min="1" />
                        </div>
                        <div class="field">
                            <label>Type</label>
                            <div class="type-buttons">
                                <div class="type-btn active" data-type="minor">Minor</div>
                                <div class="type-btn" data-type="major">Major</div>
                            </div>
                            <input type="radio" name="dashAssignmentType" value="minor" checked class="assignment-type-radio">
                            <input type="radio" name="dashAssignmentType" value="major" class="assignment-type-radio">
                        </div>
                    </div>
                    <button class="add-btn" data-action="add-assignment">
                        <i class="fas fa-plus"></i> Add Assignment
                    </button>
                </div>

                <div class="assignment-summary">
                    <span class="count">📊 <strong>${totalAssignments}</strong> assignment${totalAssignments !== 1 ? 's' : ''}</span>
                    <span class="avg-display">📈 Avg: <strong>${avgDisplay}%</strong></span>
                </div>

                <h3 class="section-h3">${selectedPeriod} Assignments</h3>
                <div class="table-wrap">
                    <table class="scores-table">
                        <thead>
                            <tr><th>Name</th><th>Score</th><th>%</th><th>Type</th><th>Grade</th><th>Date</th><th>Actions</th></tr>
                        </thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                </div>`;

            bindDetailEvents(quarterKey);
            return;
        }

        // ---------- SEMESTER / TOTAL ----------
        if (['S1', 'S2', 'Total'].includes(selectedPeriod)) {
            let title, desc;
            if (selectedPeriod === 'S1') { title = 'Semester 1 (Q1 + Q2)'; desc = 'Average of Q1 and Q2'; }
            else if (selectedPeriod === 'S2') { title = 'Semester 2 (Q3 + Q4)'; desc = 'Average of Q3 and Q4'; }
            else {
                title = 'Total Grade';
                desc = `(Final Exam × ${(WEIGHTS.EXAM * 100).toFixed(0)}%) + (Q1 × ${(WEIGHTS.Q1 * 100).toFixed(0)}%) + (Q2 × ${(WEIGHTS.Q2 * 100).toFixed(0)}%) + (Q3 × ${(WEIGHTS.Q3 * 100).toFixed(0)}%) + (Q4 × ${(WEIGHTS.Q4 * 100).toFixed(0)}%)`;
            }

            const avgValue = selectedPeriod === 'S1' ? subject.averages.semester1
                           : selectedPeriod === 'S2' ? subject.averages.semester2
                           : subject.averages.total;
            const grade = getGrade(avgValue);
            const examDisplay = subject.finalExam ? `${subject.finalExam.percentage}%` : 'N/A';

            container.innerHTML = `
                ${header}
                <div class="summary-grid">
                    <div class="summary-card">
                        <div class="value">${avgValue.toFixed(1)}%</div>
                        <div class="label">${title}</div>
                        <span class="grade-badge ${getGradeClass(grade)}">${grade}</span>
                    </div>
                    <div class="summary-card">
                        <div class="value">${examDisplay}</div>
                        <div class="label">Final Exam</div>
                    </div>
                </div>
                <div class="period-tabs">${periodTabs}</div>
                <div class="info-box">
                    <i class="fas fa-info-circle"></i>
                    <h3>${title}</h3>
                    <p>${desc}</p>
                    ${selectedPeriod === 'Total' ? `
                        <div class="weighting-breakdown">
                            <h4>Weighting Breakdown:</h4>
                            <ul>
                                <li>📝 Final Exam: ${(WEIGHTS.EXAM * 100).toFixed(0)}%</li>
                                <li>📊 Q1: ${(WEIGHTS.Q1 * 100).toFixed(0)}%</li>
                                <li>📊 Q2: ${(WEIGHTS.Q2 * 100).toFixed(0)}%</li>
                                <li>📊 Q3: ${(WEIGHTS.Q3 * 100).toFixed(0)}%</li>
                                <li>📊 Q4: ${(WEIGHTS.Q4 * 100).toFixed(0)}%</li>
                            </ul>
                            <div class="current-line">
                                Current: 📝 Final ${examDisplay} · Q1 ${subject.averages.q1.toFixed(1)}% · Q2 ${subject.averages.q2.toFixed(1)}% · Q3 ${subject.averages.q3.toFixed(1)}% · Q4 ${subject.averages.q4.toFixed(1)}%
                            </div>
                        </div>
                    ` : `
                        <div class="semester-line">
                            Q1: ${subject.averages.q1.toFixed(1)}% · Q2: ${subject.averages.q2.toFixed(1)}%${selectedPeriod === 'S2' ? ` · Q3: ${subject.averages.q3.toFixed(1)}% · Q4: ${subject.averages.q4.toFixed(1)}%` : ''}
                        </div>
                    `}
                </div>`;

            bindPeriodTabs();
            return;
        }

        container.innerHTML = `${header}<div class="empty-state"><p>Select a valid period.</p></div>`;
    }

    // ============================================================
    //  EVENT BINDING  (detail)
    // ============================================================
    function bindPeriodTabs() {
        document.querySelectorAll('#subjectDetail .period-tab').forEach(tab => {
            tab.addEventListener('click', function () {
                selectedPeriod = this.dataset.period;
                renderDetail();
            });
        });
    }

    function bindDetailEvents(quarterKey) {
        bindPeriodTabs();

        // Type toggle
        document.querySelectorAll('#subjectDetail .type-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                document.querySelectorAll('#subjectDetail .type-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                const type = this.dataset.type;
                const radios = document.querySelectorAll('input[name="dashAssignmentType"]');
                radios.forEach(r => r.checked = (r.value === type));
            });
        });

        // Add assignment
        document.querySelector('[data-action="add-assignment"]')?.addEventListener('click', addAssignment);

        // Enter key submits
        ['assignmentName', 'scoreObtained', 'scoreMax'].forEach(id => {
            document.getElementById(id)?.addEventListener('keypress', e => {
                if (e.key === 'Enter') addAssignment();
            });
        });

        // Manual average
        document.querySelector('[data-action="set-manual"]')?.addEventListener('click', () => {
            const val = document.getElementById('manualAverageInput').value;
            setManualAverage(quarterKey, val);
        });
        document.getElementById('manualAverageInput')?.addEventListener('keypress', e => {
            if (e.key === 'Enter') setManualAverage(quarterKey, e.target.value);
        });
        document.querySelector('[data-action="clear-manual"]')?.addEventListener('click', () => clearManualAverage(quarterKey));

        // Edit / delete assignment
        document.querySelectorAll('#subjectDetail [data-action="edit-assignment"]').forEach(btn => {
            btn.addEventListener('click', function () {
                editAssignment(this.dataset.quarter, this.dataset.type, parseInt(this.dataset.id));
            });
        });
        document.querySelectorAll('#subjectDetail [data-action="delete-assignment"]').forEach(btn => {
            btn.addEventListener('click', function () {
                deleteAssignment(this.dataset.quarter, this.dataset.type, parseInt(this.dataset.id));
            });
        });

        document.getElementById('assignmentName')?.focus();
    }

    // ============================================================
    //  EDIT ACTIONS
    // ============================================================
    function persistAndRefresh() {
        subjects.forEach(s => {
            calculateSubjectAverages(s);
            calculateWeightedTotal(s);
        });
        saveUserSubjects(subjects);
        updateStats();
        renderSubjectsList();
        renderDetail();
    }

    function addSubject() {
        const input = document.getElementById('subjectInput');
        const name = input.value.trim();
        if (!name) return;

        const newSubject = {
            id: Date.now(),
            name: name,
            quarters: {
                q1: { minor: [], major: [], manualAverage: null },
                q2: { minor: [], major: [], manualAverage: null },
                q3: { minor: [], major: [], manualAverage: null },
                q4: { minor: [], major: [], manualAverage: null }
            },
            averages: { q1: 0, q2: 0, q3: 0, q4: 0, semester1: 0, semester2: 0, total: 0 },
            grades: { q1: 'N/A', q2: 'N/A', q3: 'N/A', q4: 'N/A', semester1: 'N/A', semester2: 'N/A', total: 'N/A' },
            finalExam: null
        };
        subjects.push(newSubject);
        selectedSubjectId = newSubject.id;
        selectedPeriod = 'Q1';
        input.value = '';
        persistAndRefresh();
    }

    function deleteSubject(id) {
        if (!confirm('Delete this subject?')) return;
        subjects = subjects.filter(s => s.id !== id);
        if (selectedSubjectId === id) selectedSubjectId = null;
        persistAndRefresh();
    }

    function addAssignment() {
        if (!selectedSubjectId) { alert('Please select a subject first'); return; }
        const name = document.getElementById('assignmentName')?.value.trim();
        const typeRadio = document.querySelector('input[name="dashAssignmentType"]:checked');
        const type = typeRadio ? typeRadio.value : 'minor';
        const score = document.getElementById('scoreObtained')?.value;
        const max = document.getElementById('scoreMax')?.value;

        if (!name || !score || !max) { alert('Please fill all fields'); return; }
        const scoreNum = parseFloat(score);
        const maxNum = parseFloat(max);
        if (isNaN(scoreNum) || isNaN(maxNum) || maxNum <= 0) { alert('Invalid numbers'); return; }

        const percentage = Math.min((scoreNum / maxNum) * 100, 100);
        const quarterKey = selectedPeriod.toLowerCase();
        const subject = subjects.find(s => s.id === selectedSubjectId);
        if (!subject || !subject.quarters[quarterKey]) return;

        const assignment = {
            id: Date.now(),
            name,
            score: scoreNum,
            max: maxNum,
            percentage: percentage.toFixed(1),
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            type
        };
        if (type === 'minor') subject.quarters[quarterKey].minor.push(assignment);
        else subject.quarters[quarterKey].major.push(assignment);

        subject.quarters[quarterKey].manualAverage = null;
        persistAndRefresh();
    }

    function deleteAssignment(quarter, type, assignmentId) {
        if (!confirm('Delete this assignment?')) return;
        const subject = subjects.find(s => s.id === selectedSubjectId);
        if (!subject) return;

        if (type === 'minor') subject.quarters[quarter].minor = subject.quarters[quarter].minor.filter(a => a.id !== assignmentId);
        else subject.quarters[quarter].major = subject.quarters[quarter].major.filter(a => a.id !== assignmentId);

        persistAndRefresh();
    }

    function editAssignment(quarter, type, assignmentId) {
        const subject = subjects.find(s => s.id === selectedSubjectId);
        if (!subject) return;
        const assignment = type === 'minor'
            ? subject.quarters[quarter].minor.find(a => a.id === assignmentId)
            : subject.quarters[quarter].major.find(a => a.id === assignmentId);
        if (!assignment) return;

        const newName = prompt('Assignment name:', assignment.name);
        if (newName === null) return;
        const newScore = prompt('Score obtained:', assignment.score);
        if (newScore === null) return;
        const newMax = prompt('Maximum score:', assignment.max);
        if (newMax === null) return;

        const scoreNum = parseFloat(newScore);
        const maxNum = parseFloat(newMax);
        if (isNaN(scoreNum) || isNaN(maxNum) || maxNum <= 0) { alert('Invalid numbers'); return; }

        assignment.name = newName.trim() || assignment.name;
        assignment.score = scoreNum;
        assignment.max = maxNum;
        assignment.percentage = Math.min((scoreNum / maxNum) * 100, 100).toFixed(1);

        persistAndRefresh();
    }

    function setManualAverage(quarter, average) {
        if (!selectedSubjectId) return;
        const avg = parseFloat(average);
        if (isNaN(avg) || avg < 0 || avg > 100) { alert('Enter a number between 0 and 100'); return; }
        const subject = subjects.find(s => s.id === selectedSubjectId);
        if (!subject) return;

        subject.quarters[quarter].manualAverage = avg;
        persistAndRefresh();
    }

    function clearManualAverage(quarter) {
        if (!selectedSubjectId) return;
        const subject = subjects.find(s => s.id === selectedSubjectId);
        if (!subject) return;
        subject.quarters[quarter].manualAverage = null;
        persistAndRefresh();
    }

    function setFinalExam() {
        if (!selectedSubjectId) { alert('Please select a subject first.'); return; }
        const score = document.getElementById('examScore')?.value;
        const max = document.getElementById('examMax')?.value;
        if (!score || !max) { alert('Please fill in both fields.'); return; }

        const scoreNum = parseFloat(score);
        const maxNum = parseFloat(max);
        if (isNaN(scoreNum) || isNaN(maxNum) || maxNum <= 0) { alert('Invalid numbers.'); return; }

        const percentage = Math.min((scoreNum / maxNum) * 100, 100);
        const subject = subjects.find(s => s.id === selectedSubjectId);
        if (!subject) return;

        subject.finalExam = {
            score: scoreNum,
            max: maxNum,
            percentage: percentage.toFixed(1),
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        };
        persistAndRefresh();
    }

    function deleteFinalExam() {
        if (!confirm('Delete the final exam score?')) return;
        const subject = subjects.find(s => s.id === selectedSubjectId);
        if (!subject) return;
        subject.finalExam = null;
        persistAndRefresh();
    }

    // ============================================================
    //  INIT
    // ============================================================
    function initDashboard() {
        const user = getSessionUser();
        if (!user) return;

        subjects = loadUserSubjects();
        selectedSubjectId = null;
        selectedPeriod = 'Q1';

        updateStats();
        renderSubjectsList();
        renderDetail();

        // Add subject
        document.getElementById('addSubjectBtn')?.addEventListener('click', addSubject);
        document.getElementById('subjectInput')?.addEventListener('keypress', e => {
            if (e.key === 'Enter') addSubject();
        });

        // Subject list: click to select, delete button to remove
        const list = document.getElementById('subjectsList');
        if (list) {
            // Clone to prevent duplicate listeners on repeated navigations
            const fresh = list.cloneNode(true);
            list.parentNode.replaceChild(fresh, list);
            fresh.addEventListener('click', function (e) {
                const del = e.target.closest('.delete-subject-btn');
                if (del) {
                    e.stopPropagation();
                    deleteSubject(parseInt(del.dataset.id || del.dataset.deleteId));
                    return;
                }
                const card = e.target.closest('.subject-card');
                if (card) {
                    selectedSubjectId = parseInt(card.dataset.id);
                    selectedPeriod = 'Q1';
                    renderSubjectsList();
                    renderDetail();
                }
            });
        }
    }

    // Trigger on every page load dispatched by app.js
    document.addEventListener('pageLoaded', function (e) {
        if (e.detail && e.detail.page === 'dashboard') {
            initDashboard();
        }
    });

    // Fallback: standalone (dashboard.html not currently used standalone)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            if (!document.getElementById('pageContainer') && document.getElementById('subjectsList')) {
                initDashboard();
            }
        });
    } else {
        if (!document.getElementById('pageContainer') && document.getElementById('subjectsList')) {
            initDashboard();
        }
    }

})();
