// ================================================================
//  CONFIG
// ================================================================
const STORAGE_KEYS = {
    USERS: 'app_users',
    USER_DATA: 'app_data_',
    SESSION: 'app_session'
};

const WEIGHTS = { EXAM: 0.30, Q1: 0.175, Q2: 0.175, Q3: 0.175, Q4: 0.175 };

// ================================================================
//  STATE
// ================================================================
let currentUser = null;
let subjects = [];
let selectedSubjectId = null;
let selectedPeriod = 'Q1';
let editingAssignment = null;

// ================================================================
//  AUTH GUARD
// ================================================================
function initUser() {
    currentUser = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (!currentUser) {
        alert('Please log in first.');
        window.location.href = 'login.html';
        return false;
    }
    document.getElementById('userDisplay').textContent = currentUser;
    return true;
}

function logout() {
    if (!confirm('Log out?')) return;
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    window.location.href = 'login.html';
}

// ================================================================
//  PERSISTENCE
// ================================================================
function getDataKey() { return STORAGE_KEYS.USER_DATA + currentUser; }

function saveData() {
    localStorage.setItem(getDataKey(), JSON.stringify(subjects));
    renderSubjects();
    updateDashboardTotals();
}

function loadData() {
    const stored = localStorage.getItem(getDataKey());
    subjects = stored ? JSON.parse(stored) : [];
    subjects.forEach(subject => {
        if (!subject.quarters) {
            subject.quarters = {
                q1: { minor: [], major: [], manualAverage: null },
                q2: { minor: [], major: [], manualAverage: null },
                q3: { minor: [], major: [], manualAverage: null },
                q4: { minor: [], major: [], manualAverage: null }
            };
        }
        if (!subject.averages) {
            subject.averages = { q1: 0, q2: 0, q3: 0, q4: 0, semester1: 0, semester2: 0, total: 0 };
        }
        if (!subject.grades) {
            subject.grades = { q1: 'N/A', q2: 'N/A', q3: 'N/A', q4: 'N/A', semester1: 'N/A', semester2: 'N/A', total: 'N/A' };
        }
        if (subject.finalExam === undefined) subject.finalExam = null;
        calculateSubjectAverages(subject);
        calculateWeightedTotal(subject);
    });
}

// ================================================================
//  SUBJECT CRUD
// ================================================================
function addSubject() {
    const input = document.getElementById('subjectInput');
    const name = input.value.trim();
    if (!name) { alert('Please enter a subject name'); return; }

    subjects.push({
        id: Date.now(),
        name,
        quarters: {
            q1: { minor: [], major: [], manualAverage: null },
            q2: { minor: [], major: [], manualAverage: null },
            q3: { minor: [], major: [], manualAverage: null },
            q4: { minor: [], major: [], manualAverage: null }
        },
        averages: { q1: 0, q2: 0, q3: 0, q4: 0, semester1: 0, semester2: 0, total: 0 },
        grades: { q1: 'N/A', q2: 'N/A', q3: 'N/A', q4: 'N/A', semester1: 'N/A', semester2: 'N/A', total: 'N/A' },
        finalExam: null
    });
    saveData();
    input.value = '';
    input.focus();
}

function selectSubject(id) {
    selectedSubjectId = id;
    selectedPeriod = 'Q1';
    editingAssignment = null;
    renderSubjects();
    renderSubjectDetail();
}

function deleteSubject(id) {
    if (!confirm('Delete this subject?')) return;
    subjects = subjects.filter(s => s.id !== id);
    if (selectedSubjectId === id) { selectedSubjectId = null; editingAssignment = null; }
    saveData();
    renderSubjectDetail();
}

function selectPeriod(period) {
    selectedPeriod = period;
    editingAssignment = null;
    renderSubjectDetail();
}

// ================================================================
//  RENDER SUBJECT LIST
// ================================================================
function renderSubjects() {
    const container = document.getElementById('subjectsList');
    if (subjects.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-book"></i><p>No subjects yet</p></div>`;
        return;
    }
    container.innerHTML = subjects.map(subject => {
        const isActive = subject.id === selectedSubjectId;
        const gradeClass = getGradeClass(subject.grades.total);
        const hasExam = subject.finalExam !== null;
        return `
            <div class="subject-card ${isActive ? 'active' : ''}" data-id="${subject.id}">
                <div class="subject-name">
                    <span>${escapeHtml(subject.name)}</span>
                    <span>
                        <span class="grade-badge ${gradeClass}">${subject.grades.total}</span>
                        <span style="margin-left:8px;font-weight:600;color:#4f46e5;">${subject.averages.total.toFixed(1)}%</span>
                    </span>
                </div>
                <div class="subject-meta">
                    <span>${countAssignments(subject)} assignments</span>
                    <span>${hasExam ? '📝 Final Exam ✓' : ''}</span>
                    <button class="btn btn-red btn-xs delete-subject-btn" data-id="${subject.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>`;
    }).join('');
}

function countAssignments(subject) {
    return ['q1', 'q2', 'q3', 'q4'].reduce((sum, q) =>
        sum + subject.quarters[q].minor.length + subject.quarters[q].major.length, 0);
}

function updateDashboardTotals() {
    // Placeholder — the main dashboard handles its own totals.
}

// ================================================================
//  RENDER SUBJECT DETAIL
// ================================================================
function renderSubjectDetail() {
    const container = document.getElementById('subjectDetail');
    if (!selectedSubjectId) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-hand-pointer"></i>
                <h2>Select a Subject</h2>
                <p>Choose a subject to add, edit, or manage assignments</p>
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

    // ---------- FINAL EXAM TAB ----------
    if (isExam) {
        const exam = subject.finalExam;
        const hasExam = exam !== null;
        const weightPercent = (WEIGHTS.EXAM * 100).toFixed(0);

        const examDisplay = hasExam
            ? `<div class="exam-display">
                   <div>
                       <div class="exam-label">📝 Final Exam</div>
                       <div style="font-size:0.85rem; color:#64748b;">Added: ${exam.date}</div>
                   </div>
                   <div>
                       <span class="exam-score">${exam.score}/${exam.max} (${exam.percentage}%)</span>
                       <span class="exam-grade grade-badge ${getGradeClass(getGrade(exam.percentage))}">${getGrade(exam.percentage)}</span>
                   </div>
                   <button class="btn btn-red btn-sm" id="deleteExamBtn"><i class="fas fa-trash"></i> Remove</button>
               </div>`
            : `<div class="info-box" style="margin-bottom:20px;">
                   <i class="fas fa-clipboard"></i>
                   <p>No final exam added yet.</p>
               </div>`;

        container.innerHTML = `
            <div class="summary-grid">
                <div class="summary-card">
                    <div class="value">${hasExam ? exam.percentage + '%' : 'N/A'}</div>
                    <div class="label">Final Exam (${weightPercent}% of Total)</div>
                    ${hasExam ? `<span class="grade-badge ${getGradeClass(getGrade(exam.percentage))}">${getGrade(exam.percentage)}</span>` : ''}
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
                <button class="add-btn" id="saveExamBtn">
                    <i class="fas fa-save"></i> ${hasExam ? 'Update' : 'Add'} Final Exam
                </button>
            </div>
            <h3>Current Final Exam</h3>
            ${examDisplay}`;

        document.getElementById('saveExamBtn').addEventListener('click', setFinalExam);
        const delExam = document.getElementById('deleteExamBtn');
        if (delExam) delExam.addEventListener('click', deleteFinalExam);
        document.getElementById('examScore')?.focus();
        return;
    }

    // ---------- QUARTER TAB ----------
    if (isQuarter) {
        const allAssignments = [
            ...subject.quarters[quarterKey].minor.map(a => ({ ...a, type: 'minor' })),
            ...subject.quarters[quarterKey].major.map(a => ({ ...a, type: 'major' }))
        ].sort((a, b) => b.id - a.id);

        const totalAssignments = allAssignments.length;
        const totalPercentSum = allAssignments.reduce((s, a) => s + parseFloat(a.percentage), 0);
        const avgDisplay = totalAssignments > 0 ? (totalPercentSum / totalAssignments).toFixed(1) : 'N/A';
        const weightPercent = (WEIGHTS[quarterKey.toUpperCase()] * 100).toFixed(1);

        let assignmentsTable = '';
        if (allAssignments.length === 0) {
            assignmentsTable = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#94a3b8;">
                ${subject.quarters[quarterKey].manualAverage !== null
                    ? 'Manual average set. Add assignments to switch to assignment-based calculation.'
                    : 'No assignments yet.'}
            </td></tr>`;
        } else {
            assignmentsTable = allAssignments.map(a => {
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
                                <button class="btn btn-blue btn-xs edit-assignment-btn"
                                    data-quarter="${quarterKey}" data-type="${a.type}" data-id="${a.id}">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-red btn-xs delete-assignment-btn"
                                    data-quarter="${quarterKey}" data-type="${a.type}" data-id="${a.id}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>`;
            }).join('');
        }

        const manualActive = subject.quarters[quarterKey].manualAverage !== null;

        container.innerHTML = `
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
                <div class="average-setter" style="margin-bottom:20px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                        <span style="font-weight:600; color:#475569;">
                            Manual avg active: <strong>${subject.quarters[quarterKey].manualAverage}%</strong>
                        </span>
                        <button class="btn btn-red btn-sm" id="clearManualBtn">
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
                        <span style="color:#64748b;">%</span>
                        <button class="btn btn-blue btn-sm" id="setManualBtn">
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
                        <input type="radio" name="assignmentType" value="minor" id="assignmentTypeMinor" checked class="assignment-type-radio">
                        <input type="radio" name="assignmentType" value="major" id="assignmentTypeMajor" class="assignment-type-radio">
                    </div>
                </div>
                <button class="add-btn" id="addAssignmentBtn">
                    <i class="fas fa-plus"></i> Add Assignment
                </button>
            </div>

            <div class="assignment-summary">
                <span class="count">📊 <strong>${totalAssignments}</strong> assignment${totalAssignments !== 1 ? 's' : ''}</span>
                <span class="avg-display">📈 Avg: <strong>${avgDisplay}%</strong></span>
            </div>

            <h3>${selectedPeriod} Assignments</h3>
            <div class="table-wrap">
                <table class="scores-table">
                    <thead>
                        <tr><th>Name</th><th>Score</th><th>%</th><th>Type</th><th>Grade</th><th>Date</th><th>Actions</th></tr>
                    </thead>
                    <tbody>${assignmentsTable}</tbody>
                </table>
            </div>`;

        bindQuarterEvents(quarterKey);
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
                    <div style="margin-top:16px; background:white; padding:16px; border-radius:8px; text-align:left;">
                        <h4 style="color:#1e293b; margin-bottom:8px;">Weighting Breakdown:</h4>
                        <ul style="list-style:none; padding:0;">
                            <li>📝 Final Exam: ${(WEIGHTS.EXAM * 100).toFixed(0)}%</li>
                            <li>📊 Q1: ${(WEIGHTS.Q1 * 100).toFixed(0)}%</li>
                            <li>📊 Q2: ${(WEIGHTS.Q2 * 100).toFixed(0)}%</li>
                            <li>📊 Q3: ${(WEIGHTS.Q3 * 100).toFixed(0)}%</li>
                            <li>📊 Q4: ${(WEIGHTS.Q4 * 100).toFixed(0)}%</li>
                        </ul>
                        <div style="margin-top:8px; font-size:0.85rem; color:#64748b;">
                            Current: 📝 Final ${examDisplay} · Q1 ${subject.averages.q1.toFixed(1)}% · Q2 ${subject.averages.q2.toFixed(1)}% · Q3 ${subject.averages.q3.toFixed(1)}% · Q4 ${subject.averages.q4.toFixed(1)}%
                        </div>
                    </div>
                ` : `
                    <div style="margin-top:12px; font-size:0.9rem; color:#4f46e5;">
                        Q1: ${subject.averages.q1.toFixed(1)}% · Q2: ${subject.averages.q2.toFixed(1)}%${selectedPeriod === 'S2' ? ` · Q3: ${subject.averages.q3.toFixed(1)}% · Q4: ${subject.averages.q4.toFixed(1)}%` : ''}
                    </div>
                `}
            </div>`;

        bindPeriodTabs();
        return;
    }

    container.innerHTML = `<div class="empty-state"><p>Select a valid period.</p></div>`;
}

// ================================================================
//  EVENT BINDING
// ================================================================
function bindPeriodTabs() {
    document.querySelectorAll('.period-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            selectPeriod(this.dataset.period);
        });
    });
}

function bindQuarterEvents(quarterKey) {
    bindPeriodTabs();

    // Type toggle
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const type = this.dataset.type;
            document.getElementById(`assignmentType${type.charAt(0).toUpperCase() + type.slice(1)}`).checked = true;
        });
    });

    // Add assignment
    document.getElementById('addAssignmentBtn').addEventListener('click', addAssignment);

    // Enter key support
    ['assignmentName', 'scoreObtained', 'scoreMax'].forEach(id => {
        document.getElementById(id)?.addEventListener('keypress', e => {
            if (e.key === 'Enter') addAssignment();
        });
    });

    // Manual average
    const setBtn = document.getElementById('setManualBtn');
    if (setBtn) {
        setBtn.addEventListener('click', () => {
            const val = document.getElementById('manualAverageInput').value;
            setManualAverage(quarterKey, val);
        });
        document.getElementById('manualAverageInput')?.addEventListener('keypress', e => {
            if (e.key === 'Enter') setManualAverage(quarterKey, e.target.value);
        });
    }
    const clearBtn = document.getElementById('clearManualBtn');
    if (clearBtn) clearBtn.addEventListener('click', () => clearManualAverage(quarterKey));

    // Edit / delete assignment
    document.querySelectorAll('.edit-assignment-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            editAssignment(this.dataset.quarter, this.dataset.type, parseInt(this.dataset.id));
        });
    });
    document.querySelectorAll('.delete-assignment-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            deleteAssignment(this.dataset.quarter, this.dataset.type, parseInt(this.dataset.id));
        });
    });

    document.getElementById('assignmentName')?.focus();
}

// ================================================================
//  ASSIGNMENT LOGIC
// ================================================================
function addAssignment() {
    if (!selectedSubjectId) { alert('Please select a subject first'); return; }
    const name = document.getElementById('assignmentName')?.value.trim();
    const typeRadio = document.querySelector('input[name="assignmentType"]:checked');
    const type = typeRadio ? typeRadio.value : null;
    const score = document.getElementById('scoreObtained')?.value;
    const max = document.getElementById('scoreMax')?.value;

    if (!name || !type || !score || !max) { alert('Please fill all fields'); return; }
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
    calculateSubjectAverages(subject);
    calculateWeightedTotal(subject);
    saveData();
    renderSubjectDetail();
}

function deleteAssignment(quarter, type, assignmentId) {
    if (!confirm('Delete this assignment?')) return;
    const subject = subjects.find(s => s.id === selectedSubjectId);
    if (!subject) return;

    if (type === 'minor') {
        subject.quarters[quarter].minor = subject.quarters[quarter].minor.filter(a => a.id !== assignmentId);
    } else {
        subject.quarters[quarter].major = subject.quarters[quarter].major.filter(a => a.id !== assignmentId);
    }
    if (editingAssignment && editingAssignment.assignmentId === assignmentId) editingAssignment = null;

    calculateSubjectAverages(subject);
    calculateWeightedTotal(subject);
    saveData();
    renderSubjectDetail();
}

function editAssignment(quarter, type, assignmentId) {
    const subject = subjects.find(s => s.id === selectedSubjectId);
    if (!subject) return;
    const assignment = type === 'minor'
        ? subject.quarters[quarter].minor.find(a => a.id === assignmentId)
        : subject.quarters[quarter].major.find(a => a.id === assignmentId);
    if (!assignment) return;

    // Use simple prompts for a compact edit UX
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

    calculateSubjectAverages(subject);
    calculateWeightedTotal(subject);
    saveData();
    renderSubjectDetail();
}

// ================================================================
//  MANUAL AVERAGE
// ================================================================
function setManualAverage(quarter, average) {
    if (!selectedSubjectId) return;
    const avg = parseFloat(average);
    if (isNaN(avg) || avg < 0 || avg > 100) { alert('Enter a number between 0 and 100'); return; }
    const subject = subjects.find(s => s.id === selectedSubjectId);
    if (!subject) return;

    subject.quarters[quarter].manualAverage = avg;
    calculateSubjectAverages(subject);
    calculateWeightedTotal(subject);
    saveData();
    renderSubjectDetail();
}

function clearManualAverage(quarter) {
    if (!selectedSubjectId) return;
    const subject = subjects.find(s => s.id === selectedSubjectId);
    if (!subject) return;

    subject.quarters[quarter].manualAverage = null;
    calculateSubjectAverages(subject);
    calculateWeightedTotal(subject);
    saveData();
    renderSubjectDetail();
}

// ================================================================
//  FINAL EXAM
// ================================================================
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

    calculateWeightedTotal(subject);
    saveData();
    renderSubjectDetail();
}

function deleteFinalExam() {
    if (!confirm('Delete the final exam score?')) return;
    const subject = subjects.find(s => s.id === selectedSubjectId);
    if (!subject) return;
    subject.finalExam = null;
    calculateWeightedTotal(subject);
    saveData();
    renderSubjectDetail();
}

// ================================================================
//  CALCULATIONS
// ================================================================
function calculateSubjectAverages(subject) {
    ['q1', 'q2', 'q3', 'q4'].forEach(q => {
        const qd = subject.quarters[q];
        if (qd.manualAverage !== null) {
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

function calculateAverage(assignments) {
    if (!assignments || assignments.length === 0) return 0;
    return assignments.reduce((s, a) => s + parseFloat(a.percentage), 0) / assignments.length;
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
    return 'grade-' + (grade === 'N/A' ? 'N\\/A' : grade);
}

// ================================================================
//  HELPERS
// ================================================================
function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

// ================================================================
//  INIT
// ================================================================
document.addEventListener('DOMContentLoaded', function() {
    if (!initUser()) return;

    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('addSubjectBtn').addEventListener('click', addSubject);
    document.getElementById('subjectInput').addEventListener('keypress', e => {
        if (e.key === 'Enter') addSubject();
    });

    // Delegated clicks for subject list
    document.getElementById('subjectsList').addEventListener('click', function(e) {
        const delBtn = e.target.closest('.delete-subject-btn');
        if (delBtn) {
            e.stopPropagation();
            deleteSubject(parseInt(delBtn.dataset.id));
            return;
        }
        const card = e.target.closest('.subject-card');
        if (card) selectSubject(parseInt(card.dataset.id));
    });

    loadData();
    renderSubjects();
    renderSubjectDetail();
});