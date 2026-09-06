// ============================================================
//  PROFILE PAGE
// ============================================================

let currentProfileUser = null;
let profileData = null;

/**
 * Initialize the profile page
 */
function initProfilePage(user) {
    currentProfileUser = user;
    console.log('Profile page loaded for user:', user);
    
    // Load user data
    loadProfileData();
    
    // Setup password strength checker
    setupPasswordStrength();
    
    // Setup enter key for password form
    document.getElementById('profileNewPassword')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') changePassword();
    });
    document.getElementById('profileConfirmPassword')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') changePassword();
    });
}

/**
 * Load user data from localStorage
 */
function loadProfileData() {
    const data = window.loadUserData ? window.loadUserData() : null;
    profileData = data || { subjects: [] };
    
    // Calculate stats
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
    
    // Update UI
    document.getElementById('profileUsername').textContent = currentProfileUser;
    document.getElementById('profileOverallAvg').textContent = overallAvg.toFixed(1) + '%';
    document.getElementById('profileTotalSubjects').textContent = totalSubjects;
    document.getElementById('profileTotalAssignments').textContent = totalAssignments;
    
    // Load profile picture
    const users = window.getUsers ? window.getUsers() : {};
    const userData = users[currentProfileUser] || {};
    if (userData.profilePic) {
        document.getElementById('profilePagePic').src = userData.profilePic;
    } else {
        document.getElementById('profilePagePic').src = '';
    }
    
    // Load member since date
    if (userData.created) {
        const date = new Date(userData.created);
        document.getElementById('profileMemberSince').textContent = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } else {
        document.getElementById('profileMemberSince').textContent = 'Today';
    }
}

/**
 * Upload profile picture
 */
function uploadProfilePic() {
    const input = document.getElementById('profilePicInput');
    const file = input.files[0];
    if (!file) {
        alert('Please select an image file first.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const base64 = e.target.result;
        const users = window.getUsers ? window.getUsers() : {};
        if (users[currentProfileUser]) {
            users[currentProfileUser].profilePic = base64;
            if (window.saveUsers) window.saveUsers(users);
            document.getElementById('profilePagePic').src = base64;
            // Also update sidebar if it has a profile pic
            const sidebarPic = document.getElementById('sidebarProfilePic');
            if (sidebarPic) sidebarPic.src = base64;
            alert('✅ Profile picture updated!');
        }
    };
    reader.readAsDataURL(file);
}

/**
 * Remove profile picture
 */
function removeProfilePic() {
    if (!confirm('Remove your profile picture?')) return;
    const users = window.getUsers ? window.getUsers() : {};
    if (users[currentProfileUser]) {
        users[currentProfileUser].profilePic = '';
        if (window.saveUsers) window.saveUsers(users);
        document.getElementById('profilePagePic').src = '';
        const sidebarPic = document.getElementById('sidebarProfilePic');
        if (sidebarPic) sidebarPic.src = '';
        alert('✅ Profile picture removed.');
    }
}

/**
 * Setup password strength checker
 */
function setupPasswordStrength() {
    const passwordInput = document.getElementById('profileNewPassword');
    const strengthEl = document.getElementById('profilePasswordStrength');
    if (!passwordInput || !strengthEl) return;
    
    passwordInput.addEventListener('input', function() {
        const password = this.value;
        if (password.length === 0) {
            strengthEl.textContent = '';
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

/**
 * Toggle password visibility for profile forms
 */
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

/**
 * Change password
 */
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
    
    // Verify current password
    const users = window.getUsers ? window.getUsers() : {};
    const user = users[currentProfileUser];
    if (!user) {
        errorEl.textContent = 'User not found.';
        return;
    }
    
    // Check current password (using the hash function from login.js)
    if (window.hashPassword) {
        window.hashPassword(current).then(function(hashed) {
            if (hashed !== user.password) {
                errorEl.textContent = 'Current password is incorrect.';
                return;
            }
            
            // Update password
            window.hashPassword(newPass).then(function(newHashed) {
                user.password = newHashed;
                if (window.saveUsers) window.saveUsers(users);
                successEl.textContent = '✅ Password updated successfully!';
                document.getElementById('profileCurrentPassword').value = '';
                document.getElementById('profileNewPassword').value = '';
                document.getElementById('profileConfirmPassword').value = '';
                document.getElementById('profilePasswordStrength').textContent = '';
            });
        });
    } else {
        // Fallback if hash function not available (use simple btoa)
        if (btoa(current) !== user.password) {
            errorEl.textContent = 'Current password is incorrect.';
            return;
        }
        user.password = btoa(newPass);
        if (window.saveUsers) window.saveUsers(users);
        successEl.textContent = '✅ Password updated successfully!';
        document.getElementById('profileCurrentPassword').value = '';
        document.getElementById('profileNewPassword').value = '';
        document.getElementById('profileConfirmPassword').value = '';
        document.getElementById('profilePasswordStrength').textContent = '';
    }
}

/**
 * Delete account
 */
function deleteAccount() {
    if (!confirm('⚠️ Are you sure you want to permanently delete your account "' + currentProfileUser + '" and all of your data? This action cannot be undone!')) return;
    if (!confirm('⚠️ This is your final warning. Click "OK" to permanently delete your account.')) {
        alert('❌ Deletion cancelled.');
        return;
    }
    
    // Remove user data
    const dataKey = 'academicData_' + currentProfileUser;
    localStorage.removeItem(dataKey);
    
    // Remove user from registry
    const users = window.getUsers ? window.getUsers() : {};
    if (users[currentProfileUser]) {
        delete users[currentProfileUser];
        if (window.saveUsers) window.saveUsers(users);
    }
    
    // Clear session
    localStorage.removeItem('currentUser');
    
    // Redirect to login
    alert('✅ Account "' + currentProfileUser + '" has been permanently deleted.');
    window.location.href = 'login.html';
}

/**
 * Clear all data (nuclear option)
 */
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

document.addEventListener('pageLoaded', function(e) {
    if (e.detail.page === 'profile') {
        initProfilePage(e.detail.user);
    }
});

// ============================================================
//  EXPOSE FUNCTIONS TO GLOBAL SCOPE
// ============================================================

window.initProfilePage = initProfilePage;
window.uploadProfilePic = uploadProfilePic;
window.removeProfilePic = removeProfilePic;
window.changePassword = changePassword;
window.toggleProfilePassword = toggleProfilePassword;
window.deleteAccount = deleteAccount;
window.clearAllData = clearAllData;