// =============================================================
//  DASHBOARD PAGE
// =============================================================

document.addEventListener('pageLoaded', function(e) {
    if (e.detail.page !== 'dashboard') return;
    const user = e.detail.user;
    console.log('Dashboard loaded for user:', user);

    // Load user data
    const data = window.loadUserData ? window.loadUserData() : null;
    const subjects = data?.subjects || [];

    // Render stats
    updateStats(subjects);

    // Render subjects list
    renderSubjects(subjects);

    // Add subject
    document.getElementById('addSubjectBtn').addEventListener('click', function() {
        const input = document.getElementById('subjectInput');
        const name = input.value.trim();
        if (!name) return;
        const newSubject = {
            id: Date.now(),
            name: name,
            quarters: { q1: { minor: [], major: [] }, q2: { minor: [], major: [] }, q3: { minor: [], major: [] }, q4: { minor: [], major: [] } },
            averages: { q1: 0, q2: 0, q3: 0, q4: 0, semester1: 0, semester2: 0, total: 0 }
        };
        subjects.push(newSubject);
        saveData(subjects);
        input.value = '';
        renderSubjects(subjects);
        updateStats(subjects);
    });
});

function updateStats(subjects) {
    let totalAvg = 0;
    let sem1Avg = 0;
    let sem2Avg = 0;
    let withScores = 0;
    subjects.forEach(s => {
        if (s.averages.total > 0) { totalAvg += s.averages.total; withScores++; }
        if (s.averages.semester1 > 0) sem1Avg += s.averages.semester1;
        if (s.averages.semester2 > 0) sem2Avg += s.averages.semester2;
    });
    totalAvg = withScores ? (totalAvg / withScores) : 0;
    sem1Avg = subjects.length ? (sem1Avg / subjects.length) : 0;
    sem2Avg = subjects.length ? (sem2Avg / subjects.length) : 0;

    document.getElementById('totalAverage').textContent = totalAvg.toFixed(1) + '%';
    document.getElementById('semester1Avg').textContent = sem1Avg.toFixed(1) + '%';
    document.getElementById('semester2Avg').textContent = sem2Avg.toFixed(1) + '%';
    document.getElementById('totalSubjects').textContent = subjects.length;
}

function renderSubjects(subjects) {
    const container = document.getElementById('subjectsList');
    if (subjects.length === 0) {
        container.innerHTML = '<div class="empty-state">No subjects yet</div>';
        return;
    }
    let html = '';
    subjects.forEach(s => {
        html += `<div class="subject-card" onclick="window.selectSubject(${s.id})">
            <div class="subject-name">${s.name}</div>
            <div>Avg: ${s.averages.total.toFixed(1)}%</div>
        </div>`;
    });
    container.innerHTML = html;
}

function saveData(subjects) {
    const data = { subjects };
    if (window.saveUserData) window.saveUserData(data);
    else console.warn('saveUserData not available');
}

// Expose selectSubject globally
window.selectSubject = function(id) {
    console.log('Selected subject:', id);
    // In a full implementation, this would load the subject detail
};