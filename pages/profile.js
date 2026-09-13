// ============================================================
//  PROFILE PAGE
// ============================================================

let currentProfileUser = null;
let profileData = null;

function getDefaultAvatar() {
    return window.DEFAULT_AVATAR || '';
}

function initProfilePage(user) {
    currentProfileUser = user;
    console.log('Profile page loaded for user:', user);

    loadProfileData();
    setupPasswordStrength();

    // ---- Wire up buttons ----
    document.getElementById('profilePicWrapper')?.addEventListener('click', openPicPicker);
    document.getElementById('profilePicOverlay')?.addEventListener('click', openPicPicker);
    document.getElementById('uploadPicBtn')?.addEventListener('click', openPicPicker);
    document.getElementById('removePicBtn')?.addEventListener('click', removeProfilePic);

    const picInput = document.getElementById('profilePicInput');
    if (picInput) {
        const fresh = picInput.cloneNode(true);
        picInput.parentNode.replaceChild(fresh, picInput);
        fresh.addEventListener('change', uploadProfilePic);
    }

    document.getElementById('changePasswordBtn')?.addEventListener('click', changePassword);
    document.getElementById('deleteAccountBtn')?.addEventListener('click', deleteAccount);
    document.getElementById('clearAllDataBtn')?.addEventListener('click', clearAllData);

    document.getElementById('exportDataBtn')?.addEventListener('click', exportUserData);
    document.getElementById('importDataBtn')?.addEventListener('click', function () {
        document.getElementById('importDataInput')?.click();
    });
    const importInput = document.getElementById('importDataInput');
    if (importInput) {
        const fresh = importInput.cloneNode(true);
        importInput.parentNode.replaceChild(fresh, importInput);
        fresh.addEventListener('change', importUserData);
    }

    document.querySelectorAll('.toggle-password-btn').forEach(btn => {
        const fresh = btn.cloneNode(true);
        btn.parentNode.replaceChild(fresh, btn);
        fresh.addEventListener('click', function () {
            const targetId = this.dataset.target;
            if (targetId) toggleProfilePassword(targetId, this);
        });
    });

    document.getElementById('profileNewPassword')?.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') changePassword();
    });
    document.getElementById('profileConfirmPassword')?.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') changePassword();
    });
}

function openPicPicker() {
    document.getElementById('profilePicInput')?.click();
}

function loadProfileData() {
    const data = window.loadUserData ? window.loadUserData() : null;
    profileData = data || { subjects: [] };

    const totalSubjects = profileData.subjects ? profileData.subjects.length : 0;
    let totalAssignments = 0;
    let overallAvg = 0;
    let withScores = 0;

    if (profileData.subjects) {
        profileData.subjects.forEach(s => {
            ['q1', 'q2', 'q3', 'q4'].forEach(q => {
                if (s.quarters && s.quarters[q]) {
                    totalAssignments += (s.quarters[q].minor || []).length + (s.quarters[q].major || []).length;
                }
            });
            if (s.averages && s.averages.total > 0) {
                overallAvg += s.averages.total;
                withScores++;
            }
        });
        overallAvg = withScores > 0 ? (overallAvg / withScores) : 0;
    }

    const userEl = document.getElementById('profileUsername');
    const avgEl = document.getElementById('profileOverallAvg');
    const subjEl = document.getElementById('profileTotalSubjects');
    const asgEl = document.getElementById('profileTotalAssignments');
    const sinceEl = document.getElementById('profileMemberSince');

    if (userEl) userEl.textContent = currentProfileUser;
    if (avgEl) avgEl.textContent = overallAvg.toFixed(1) + '%';
    if (subjEl) subjEl.textContent = totalSubjects;
    if (asgEl) asgEl.textContent = totalAssignments;

    // Profile picture (falls back to default)
    const users = window.getUsers ? window.getUsers() : {};
    const userData = users[currentProfileUser] || {};
    const src = userData.profilePic || getDefaultAvatar();

    const picEl = document.getElementById('profilePagePic');
    if (picEl) picEl.src = src;

    // Also refresh the sidebar / header avatars now that we've read the record
    if (window.applyProfilePictures) window.applyProfilePictures();

    if (sinceEl) {
        if (userData.created) {
            sinceEl.textContent = new Date(userData.created).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
            });
        } else {
            sinceEl.textContent = 'Today';
        }
    }
}

function uploadProfilePic(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        event.target.value = '';
        return;
    }
    if (file.size > 3 * 1024 * 1024) {
        alert('Image is too large. Please pick one under 3 MB.');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const base64 = e.target.result;
        const users = window.getUsers ? window.getUsers() : {};
        if (!users[currentProfileUser]) users[currentProfileUser] = { username: currentProfileUser };
        users[currentProfileUser].profilePic = base64;

        if (window.saveUsers) window.saveUsers(users);

        const picEl = document.getElementById('profilePagePic');
        if (picEl) picEl.src = base64;
        if (window.applyProfilePictures) window.applyProfilePictures();

        alert('✅ Profile picture updated!');
        event.target.value = '';
    };
    reader.onerror = function () {
        alert('Could not read that file. Please try another.');
        event.target.value = '';
    };
    reader.readAsDataURL(file);
}

function removeProfilePic() {
    if (!confirm('Remove your profile picture and use the default avatar?')) return;

    const users = window.getUsers ? window.getUsers() : {};
    if (!users[currentProfileUser]) {
        users[currentProfileUser] = { username: currentProfileUser };
    }

    users[currentProfileUser].profilePic = '';
    if (window.saveUsers) window.saveUsers(users);

    // Immediately show the default avatar everywhere
    const src = getDefaultAvatar();
    const picEl = document.getElementById('profilePagePic');
    if (picEl) picEl.src = src;
    if (window.applyProfilePictures) window.applyProfilePictures();

    alert('✅ Profile picture removed — using default avatar.');
}

// ============================================================
//  DATA EXPORT / IMPORT
// ============================================================
function exportUserData() {
    if (!currentProfileUser) { alert('No user session found.'); return; }

    const dataKey = 'academicData_' + currentProfileUser;
    const calendarKey = 'app_calendar_' + currentProfileUser;
    const tutorialKey = 'app_tutorial_' + currentProfileUser;

    const users = window.getUsers ? window.getUsers() : {};
    const userRecord = users[currentProfileUser] || {};

    const exportPayload = {
        _meta: {
            app: 'Academic Tracker',
            version: 1,
            exportedAt: new Date().toISOString(),
            username: currentProfileUser
        },
        user: {
            username: currentProfileUser,
            created: userRecord.created || null,
            profilePic: userRecord.profilePic || '',
            notes: userRecord.notes || ''
        },
        subjects: (() => {
            const raw = localStorage.getItem(dataKey);
            if (!raw) return [];
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed;
                if (parsed && Array.isArray(parsed.subjects)) return parsed.subjects;
                return [];
            } catch (e) { return []; }
        })(),
        calendar: (() => {
            const raw = localStorage.getItem(calendarKey);
            if (!raw) return {};
            try { return JSON.parse(raw); } catch (e) { return {}; }
        })(),
        tutorialSeen: !!localStorage.getItem(tutorialKey)
    };

    const json = JSON.stringify(exportPayload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `academic-tracker_${currentProfileUser}_${stamp}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDataStatus('✅ Exported to ' + filename, 'success');
}

function importUserData(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        let payload;
        try {
            payload = JSON.parse(e.target.result);
        } catch (err) {
            alert('❌ That file is not valid JSON.');
            event.target.value = '';
            return;
        }

        if (!payload || typeof payload !== 'object') {
            alert('❌ Invalid backup file.');
            event.target.value = '';
            return;
        }

        if (!confirm('⚠️ This will OVERWRITE your current subjects, notes, and calendar events.\n\nContinue with the import?')) {
            event.target.value = '';
            return;
        }

        try {
            const dataKey = 'academicData_' + currentProfileUser;
            const incomingSubjects = payload.subjects || (payload.data && payload.data.subjects) || [];
            localStorage.setItem(dataKey, JSON.stringify({ subjects: incomingSubjects }));

            const users = window.getUsers ? window.getUsers() : {};
            if (!users[currentProfileUser]) users[currentProfileUser] = { username: currentProfileUser };
            if (payload.user) {
                if (typeof payload.user.notes === 'string') users[currentProfileUser].notes = payload.user.notes;
                if (typeof payload.user.profilePic === 'string') users[currentProfileUser].profilePic = payload.user.profilePic;
                if (payload.user.created && !users[currentProfileUser].created) users[currentProfileUser].created = payload.user.created;
            }
            if (window.saveUsers) window.saveUsers(users);

            if (payload.calendar && typeof payload.calendar === 'object') {
                localStorage.setItem('app_calendar_' + currentProfileUser, JSON.stringify(payload.calendar));
            }
            if (payload.tutorialSeen) {
                localStorage.setItem('app_tutorial_' + currentProfileUser, 'true');
            }

            alert('✅ Data imported successfully! Reloading…');
            setTimeout(() => window.location.reload(), 400);
        } catch (err) {
            console.error(err);
            alert('❌ Import failed. Check the browser console for details.');
        }
        event.target.value = '';
    };
    reader.onerror = function () {
        alert('❌ Could not read that file.');
        event.target.value = '';
    };
    reader.readAsText(file);
}

function setDataStatus(msg, type) {
    const el = document.getElementById('dataStatus');
    if (!el) return;
    el.textContent = msg;
    el.className = 'data-status ' + (type || '');
    if (type === 'success') {
        setTimeout(() => { el.textContent = ''; el.className = 'data-status'; }, 4000);
    }
}

// ============================================================
//  PASSWORD
// ============================================================
function setupPasswordStrength() {
    const passwordInput = document.getElementById('profileNewPassword');
    const strengthEl = document.getElementById('profilePasswordStrength');
    if (!passwordInput || !strengthEl) return;

    passwordInput.addEventListener('input', function () {
        const password = this.value;
        if (password.length === 0) {
            strengthEl.textContent = '';
            strengthEl.className = 'password-strength';
            return;
        }

        let score = 0;
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^a-zA-Z0-9]/.test(password)) score++;

        const labels = ['', 'Weak', 'Weak', 'Medium', 'Strong', 'Very Strong', 'Excellent'];
        const classes = ['', 'weak', 'weak', 'medium', 'strong', 'very-strong', 'very-strong'];
        const strength = Math.min(Math.floor(score / 1.5) + 1, 6);

        strengthEl.textContent = 'Strength: ' + (labels[strength] || '');
        strengthEl.className = 'password-strength ' + (classes[strength] || '');
    });
}

function toggleProfilePassword(inputId, button) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const icon = button.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

function changePassword() {
    const current = document.getElementById('profileCurrentPassword').value;
    const newPass = document.getElementById('profileNewPassword').value;
    const confirm = document.getElementById('profileConfirmPassword').value;
    const errorEl = document.getElementById('profilePasswordError');
    const successEl = document.getElementById('profilePasswordSuccess');

    errorEl.textContent = '';
    successEl.textContent = '';

    if (!current || !newPass || !confirm) {
        errorEl.textContent = 'Please fill in all fields.';
        return;
    }
    if (newPass.length < 4) {
        errorEl.textContent = 'New password must be at least 4 characters.';
        return;
    }
    if (newPass !== confirm) {
        errorEl.textContent = 'New passwords do not match.';
        return;
    }

    const users = window.getUsers ? window.getUsers() : {};
    const user = users[currentProfileUser];
    if (!user) {
        errorEl.textContent = 'User not found.';
        return;
    }

    // The field is `passwordHash` (written by login.js), NOT `password`.
    const storedHash = user.passwordHash || user.password;

    if (window.hashPassword) {
        window.hashPassword(current).then(function (hashed) {
            if (hashed !== storedHash) {
                errorEl.textContent = 'Current password is incorrect.';
                return;
            }
            window.hashPassword(newPass).then(function (newHashed) {
                user.passwordHash = newHashed;
                delete user.password; // remove any legacy field
                if (window.saveUsers) window.saveUsers(users);
                successEl.textContent = '✅ Password updated successfully!';
                document.getElementById('profileCurrentPassword').value = '';
                document.getElementById('profileNewPassword').value = '';
                document.getElementById('profileConfirmPassword').value = '';
                document.getElementById('profilePasswordStrength').textContent = '';
            });
        });
    } else {
        // Fallback for legacy btoa-based hash
        if (btoa(current) !== storedHash) {
            errorEl.textContent = 'Current password is incorrect.';
            return;
        }
        user.passwordHash = btoa(newPass);
        delete user.password;
        if (window.saveUsers) window.saveUsers(users);
        successEl.textContent = '✅ Password updated successfully!';
        document.getElementById('profileCurrentPassword').value = '';
        document.getElementById('profileNewPassword').value = '';
        document.getElementById('profileConfirmPassword').value = '';
        document.getElementById('profilePasswordStrength').textContent = '';
    }
}

// ============================================================
//  DANGER ZONE
// ============================================================
function deleteAccount() {
    if (!confirm('⚠️ Are you sure you want to permanently delete your account "' + currentProfileUser + '" and all of your data? This action cannot be undone!')) return;
    if (!confirm('⚠️ This is your final warning. Click "OK" to permanently delete your account.')) {
        alert('❌ Deletion cancelled.');
        return;
    }

    localStorage.removeItem('academicData_' + currentProfileUser);
    localStorage.removeItem('app_calendar_' + currentProfileUser);
    localStorage.removeItem('app_tutorial_' + currentProfileUser);

    const users = window.getUsers ? window.getUsers() : {};
    if (users[currentProfileUser]) {
        delete users[currentProfileUser];
        if (window.saveUsers) window.saveUsers(users);
    }

    localStorage.removeItem('currentUser');
    alert('✅ Account "' + currentProfileUser + '" has been permanently deleted.');
    window.location.href = 'login.html';
}

function clearAllData() {
    if (!confirm('⚠️ NUCLEAR OPTION: This will erase ALL data for ALL users. This cannot be undone!')) return;
    if (!confirm('⚠️ FINAL WARNING: All data will be permanently deleted. Continue?')) return;
    localStorage.clear();
    alert('✅ All data has been permanently cleared.');
    window.location.href = 'login.html';
}

// ============================================================
//  PAGE LOAD EVENT
// ============================================================
document.addEventListener('pageLoaded', function (e) {
    if (e.detail.page === 'profile') {
        initProfilePage(e.detail.user);
    }
});

window.initProfilePage = initProfilePage;
window.uploadProfilePic = uploadProfilePic;
window.removeProfilePic = removeProfilePic;
window.changePassword = changePassword;
window.toggleProfilePassword = toggleProfilePassword;
window.deleteAccount = deleteAccount;
window.clearAllData = clearAllData;
window.exportUserData = exportUserData;
window.importUserData = importUserData;
