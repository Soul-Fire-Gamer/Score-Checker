// ================================================================
//  CONFIG & STATE  (aligned with app.js / dashboard.js / login.js)
// ================================================================
const STORAGE_KEYS = {
    USERS: 'academicTracker_users',
    USER_DATA: 'academicData_',
    SESSION: 'currentUser'
};

const WEIGHTS = { EXAM: 0.30, Q1: 0.175, Q2: 0.175, Q3: 0.175, Q4: 0.175 };

// NOTE: no top-level `currentUser` here — that name is already taken by app.js
let subjects = [];
let selectedSubjectId = null;
let selectedPeriod = 'Q1';

// ================================================================
//  SESSION HELPER
// ================================================================
function getSessionUser() {
    return localStorage.getItem(STORAGE_KEYS.SESSION);
}

// ================================================================
//  PERSISTENCE  (shares data with Dashboard via academicData_<user>)
// ================================================================
function getDataKey() {
    return STORAGE_KEYS.USER_DATA + getSessionUser();
}

function saveData() {
    // Store as { subjects: [...] } — same shape Dashboard reads/writes
    localStorage.setItem(getDataKey(), JSON.stringify({ subjects: subjects }));
    renderSubjectsList();
}

function loadData() {
    const stored = localStorage.getItem(getDataKey());
    const parsed = stored ? JSON.parse(stored) : null;
    if (Array.isArray(parsed)) {
        subjects = parsed;
    } else if (parsed && Array.isArray(parsed.subjects)) {
        subjects = parsed.subjects;
    } else {
        subjects = [];
    }

    // Normalize every subject so older Dashboard-created ones are safe to edit
    subjects.forEach(subject => {
        if (!subject.quarters) {
            subject.quarters = {
                q1: { minor: [], major: [], manualAverage: null },
                q2: { minor: [], major: [], manualAverage: null },
                q3: { minor: [], major: [], manualAverage: null },
                q4: { minor: [], major: [], manualAverage: null }
            };
        } else {
            ['q1', 'q2', 'q3', 'q4'].forEach(q => {
                if (!subject.quarters[q]) {
                    subject.quarters[q] = { minor: [], major: [], manualAverage: null };
                }
                if (subject.quarters[q].manualAverage === undefined) subject.quarters[q].manualAverage = null;
                if (!Array.isArray(subject.quarters[q].minor)) subject.quarters[q].minor = [];
                if (!Array.isArray(subject.quarters[q].major)) subject.quarters[q].major = [];
            });
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
//  SUBJECT LIST  (main page)
// ================================================================
function renderSubjectsList() {
    const container = document.getElementById('subjectsList');
    const emptyState = document.getElementById('emptyState');
    if (!container) return;

    if (subjects.length === 0) {
        container.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    if (emptyState) emptyState.style.display = 'none';

    container.innerHTML = subjects.map(subject => {
        const gradeClass = getGradeClass(subject.grades.total);
        const hasExam = subject.finalExam !== null;
        const examDisplay = hasExam
            ? `📝 Final: ${subject.finalExam.percentage}%`
            : '📝 Final: Not set';
        const count = countAssignments(subject);

        return `
            <div class="subject-card" data-id="${subject.id}">
                <div class="subject-card-top">
                    <div class="subject-info">
                        <div class="subject-name">${escapeHtml(subject.name)}</div>
                        <div class="subject-meta">${count} assignment${count !== 1 ? 's' : ''}</div>
                    </div>
                    <div class="subject-final-status">${examDisplay}</div>
                    <div class="subject-right">
                        <div class="subject-grade-row">
                            <span class="grade-badge ${gradeClass}">${subject.grades.total}</span>
                            <span class="subject-percent">${subject.averages.total.toFixed(1)}%</span>
                        </div>
                        <button class="delete-subject-btn" data-delete-id="${subject.id}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
                <div class="subject-quarters">
                    <span>Q1: ${subject.averages.q1.toFixed(1)}%</span>
                    <span>|</span>
                    <span>Q2: ${subject.averages.q2.toFixed(1)}%</span>
                    <span>|</span>
                    <span>Q3: ${subject.averages.q3.toFixed(1)}%</span>
                    <span>|</span>
                    <span>Q4: ${subject.averages.q4.toFixed(1)}%</span>
                    <span>|</span>
                    <span>${examDisplay}</span>
                </div>
            </div>`;
    }).join('');
}

function countAssignments(subject) {
    return ['q1', 'q2', 'q3', 'q4'].reduce((sum, q) =>
        sum + subject.quarters[q].minor.length + subject.quarters[q].major.length, 0);
}

// ================================================================
//  OPEN / CLOSE EDITOR MODAL
// ================================================================
function openEditor(id) {
    selectedSubjectId = id;
    selectedPeriod = 'Q1';
    const modal = document.getElementById('editorModal');
    if (modal) modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    renderEditor();
}

function closeEditor() {
    const modal = document.getElementById('editorModal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
    selectedSubjectId = null;
    renderSubjectsList();
}

// ================================================================
//  RENDER EDITOR  (inside the modal)
// ================================================================
function renderEditor() {
    const container = document.getElementById('editorContainer');
    if (!container) return;
    if (!selectedSubjectId) return;
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

    const subjectHeader = `
        <h2 style="margin-bottom:20px; color:#1e293b; display:flex; align-items:center; gap:10px;">
            <i class="fas fa-book" style="color:#4f46e5;"></i>
            ${escapeHtml(subject.name)}
        </h2>`;

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
            ${subjectHeader}
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
            <h3 style="margin-bottom:12px;">Current Final Exam</h3>
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
            ${subjectHeader}
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

            <h3 style="margin-bottom:12px;">${selectedPeriod} Assignments</h3>
            <div class="table-wrap">
                <table class="scores-table">
                    <thead>
                        <tr><th>Name</th><th>Score</th><th>%</th><th>Type</th><th>Grade</th><th>Date</th><th>Actions</th></tr>
                    </thead>
                    <tbody>${assignmentsTable}</tbody>
                </table>
            </div>`;

        bindEditorEvents(quarterKey);
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
            ${subjectHeader}
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

    container.innerHTML = `${subjectHeader}<div class="empty-state"><p>Select a valid period.</p></div>`;
}

// ================================================================
//  EVENT BINDING  (editor)
// ================================================================
function bindPeriodTabs() {
    document.querySelectorAll('.period-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            selectedPeriod = this.dataset.period;
            renderEditor();
        });
    });
}

function bindEditorEvents(quarterKey) {
    bindPeriodTabs();

    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const type = this.dataset.type;
            document.getElementById(`assignmentType${type.charAt(0).toUpperCase() + type.slice(1)}`).checked = true;
        });
    });

    document.getElementById('addAssignmentBtn').addEventListener('click', addAssignment);

    ['assignmentName', 'scoreObtained', 'scoreMax'].forEach(id => {
        document.getElementById(id)?.addEventListener('keypress', e => {
            if (e.key === 'Enter') addAssignment();
        });
    });

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
    renderEditor();
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

    calculateSubjectAverages(subject);
    calculateWeightedTotal(subject);
    saveData();
    renderEditor();
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

    calculateSubjectAverages(subject);
    calculateWeightedTotal(subject);
    saveData();
    renderEditor();
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
    renderEditor();
}

function clearManualAverage(quarter) {
    if (!selectedSubjectId) return;
    const subject = subjects.find(s => s.id === selectedSubjectId);
    if (!subject) return;

    subject.quarters[quarter].manualAverage = null;
    calculateSubjectAverages(subject);
    calculateWeightedTotal(subject);
    saveData();
    renderEditor();
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
    renderEditor();
}

function deleteFinalExam() {
    if (!confirm('Delete the final exam score?')) return;
    const subject = subjects.find(s => s.id === selectedSubjectId);
    if (!subject) return;
    subject.finalExam = null;
    calculateWeightedTotal(subject);
    saveData();
    renderEditor();
}

// ================================================================
//  CALCULATIONS
// ================================================================
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
    return 'grade-' + (grade === 'N/A' ? 'grade-NA' : grade);
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
//  EVENT HANDLERS
// ================================================================
function handleListClick(e) {
    const delBtn = e.target.closest('.delete-subject-btn');
    if (delBtn) {
        e.stopPropagation();
        const id = parseInt(delBtn.dataset.deleteId);
        if (confirm('Delete this subject?')) {
            subjects = subjects.filter(s => s.id !== id);
            saveData();
        }
        return;
    }
    const card = e.target.closest('.subject-card');
    if (card) openEditor(parseInt(card.dataset.id));
}

// ================================================================
//  INIT  (works both standalone and inside app.js router)
// ================================================================
function initSubjectsPage() {
    const sessionUser = getSessionUser();
    if (!sessionUser) {
        if (!document.getElementById('pageContainer')) {
            alert('Please log in first.');
            window.location.href = 'login.html';
            return;
        }
        return;
    }

    // ---- 1) Clone the subject LIST, then bind to the fresh node ----
    let list = document.getElementById('subjectsList');
    if (list) {
        const newList = list.cloneNode(true);
        list.parentNode.replaceChild(newList, list);
        newList.addEventListener('click', handleListClick);
    }

    // ---- 2) Clone the MODAL first (this wipes stale listeners), THEN ----
    //         walk into the new tree and bind to the X button & backdrop.
    let modal = document.getElementById('editorModal');
    if (modal) {
        const newModal = modal.cloneNode(true);
        modal.parentNode.replaceChild(newModal, modal);

        // Click on the dark backdrop closes the modal
        newModal.addEventListener('click', function(e) {
            if (e.target === this) closeEditor();
        });

        // The X button lives inside the new modal, so bind it AFTER cloning
        const closeBtn = newModal.querySelector('#closeModalBtn');
        if (closeBtn) closeBtn.addEventListener('click', closeEditor);
    }

    loadData();
    renderSubjectsList();
}

// Document-level Escape handler — attach once
if (!window._subjectsKeydownAttached) {
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeEditor();
    });
    window._subjectsKeydownAttached = true;
}

// ---- Primary trigger: app.js dispatches this every time it loads a page ----
document.addEventListener('pageLoaded', function(e) {
    if (e.detail && e.detail.page === 'subjects') {
        initSubjectsPage();
    }
});

// ---- Fallback: when opened standalone (subjects.html directly) ----
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        if (!document.getElementById('pageContainer') && document.getElementById('subjectsList')) {
            initSubjectsPage();
        }
    });
} else {
    if (!document.getElementById('pageContainer') && document.getElementById('subjectsList')) {
        initSubjectsPage();
    }
}
