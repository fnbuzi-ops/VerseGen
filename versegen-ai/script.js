// This script assumes `window.supabase` is initialized in index.html
const supabase = window.supabase;

// --- DOM Elements ---
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const showSignup = document.getElementById('show-signup');
const showLogin = document.getElementById('show-login');
const authMessage = document.getElementById('auth-message');
const logoutButton = document.getElementById('logout-button');
const userEmail = document.getElementById('user-email');
const userTierBadge = document.getElementById('user-tier-badge');
const userTierText = document.getElementById('user-tier-text');
const navButtons = document.querySelectorAll('.nav-btn');
const tabs = document.querySelectorAll('.tab-content');
const globalMessage = document.getElementById('global-message');

// AI Form Elements
const creatorForm = document.getElementById('creator-form');
const creatorResult = document.getElementById('creator-result');
const coachingForm = document.getElementById('coaching-form');
const coachingResult = document.getElementById('coaching-result');
const hardwareForm = document.getElementById('hardware-form');
const hardwareResult = document.getElementById('hardware-result');
const brandingForm = document.getElementById('branding-form');
const brandingResult = document.getElementById('branding-result');
const vodQueueForm = document.getElementById('vod-queue-form');
const vodQueueMessage = document.getElementById('vod-queue-message');

// --- State ---
let currentUser = null;
let userProfile = null;

// --- Auth Functions ---

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        showAuthMessage('error', error.message);
    } else {
        showAuthMessage('success', 'Logged in successfully! Loading app...');
        await loadUserSession();
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
        showAuthMessage('error', error.message);
    } else {
        showAuthMessage('success', 'Account created! Check your email for verification.');
    }
}

async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        showGlobalMessage('error', error.message);
    } else {
        currentUser = null;
        userProfile = null;
        authContainer.classList.remove('hidden');
        appContainer.classList.add('hidden');
    }
}

function showAuthMessage(type, message) {
    authMessage.textContent = message;
    authMessage.className = `message ${type}`;
}

// --- App UI Functions ---

function showAppUI() {
    authContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');
}

function updateUserInfo() {
    if (currentUser && userProfile) {
        userEmail.textContent = currentUser.email;
        userTierBadge.textContent = userProfile.tier;
        userTierText.textContent = userProfile.tier;
        userTierBadge.className = `badge ${userProfile.tier}`;

        // Unlock features based on tier
        updateFeatureLocks(userProfile.tier);
    }
}

function updateFeatureLocks(tier) {
    const allTabs = document.querySelectorAll('.tab-content');
    const allNavButtons = document.querySelectorAll('.nav-btn');

    allTabs.forEach(tab => {
        tab.classList.remove('unlocked');
        tab.classList.add('locked');
    });

    allNavButtons.forEach(btn => {
        btn.classList.remove('unlocked');
    });

    // Unlock free (all)
    document.getElementById('tab-dashboard').classList.add('unlocked');
    document.getElementById('tab-creator').classList.add('unlocked'); // User wanted this free?
    document.getElementById('tab-coaching').classList.add('unlocked');
    document.querySelector('[data-target="tab-dashboard"]').classList.add('unlocked');
    document.querySelector('[data-target="tab-creator"]').classList.add('unlocked');
    document.querySelector('[data-target="tab-coaching"]').classList.add('unlocked');

    // Unlock Paid
    if (tier === 'paid' || tier === 'elite') {
        document.getElementById('tab-hardware').classList.add('unlocked');
        document.getElementById('tab-branding').classList.add('unlocked');
        document.querySelector('[data-target="tab-hardware"]').classList.add('unlocked');
        document.querySelector('[data-target="tab-branding"]').classList.add('unlocked');
    }

    // Unlock Elite
    if (tier === 'elite') {
        document.getElementById('tab-elite').classList.add('unlocked');
        document.querySelector('[data-target="tab-elite"]').classList.add('unlocked');
    }
}

function handleTabSwitch(e) {
    const targetButton = e.target.closest('.nav-btn');
    if (!targetButton) return;

    const targetTabId = targetButton.dataset.target;
    const targetTab = document.getElementById(targetTabId);

    // Check tier access
    const requiredTier = targetButton.dataset.tier;
    if (requiredTier) {
        if (requiredTier === 'paid' && (userProfile.tier !== 'paid' && userProfile.tier !== 'elite')) {
            showGlobalMessage('error', 'This feature requires a Paid or Elite tier.');
            return;
        }
        if (requiredTier === 'elite' && userProfile.tier !== 'elite') {
            showGlobalMessage('error', 'This feature requires the Elite tier.');
            return;
        }
    }

    // Switch tabs
    navButtons.forEach(btn => btn.classList.remove('active'));
    targetButton.classList.add('active');

    tabs.forEach(tab => tab.classList.remove('active'));
    targetTab.classList.add('active');
}

function showGlobalMessage(type, message) {
    globalMessage.textContent = message;
    globalMessage.className = `global-message ${type}`;
    globalMessage.classList.add('show');
    setTimeout(() => {
        globalMessage.classList.remove('show');
    }, 3000);
}

// --- AI Backend Call Functions ---

function showLoader(resultBox) {
    resultBox.querySelector('.loader').classList.remove('hidden');
    resultBox.querySelector('.ai-result-content').textContent = '';
    const img = resultBox.querySelector('.ai-result-image');
    if (img) img.classList.add('hidden');
}

function hideLoader(resultBox) {
    resultBox.querySelector('.loader').classList.add('hidden');
}

function showResult(resultBox, text) {
    hideLoader(resultBox);
    resultBox.querySelector('.ai-result-content').textContent = text;
}

function showImageResult(resultBox, base64Data) {
    hideLoader(resultBox);
    const img = resultBox.querySelector('.ai-result-image');
    img.src = `data:image/png;base64,${base64Data}`;
    img.classList.remove('hidden');
}

/**
 * Converts a file to Base64 string.
 * @param {File} file - The file to convert.
 * @returns {Promise<string>} - The Base64 string (without data prefix).
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            // Remove 'data:image/jpeg;base64,' part
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
}

// --- Event Handlers for AI Forms ---

// 1. Content Creator AI (Text-only)
creatorForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const prompt = document.getElementById('creator-prompt').value;
    showLoader(creatorResult);

    try {
        const response = await fetch('/api/generate-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                prompt, 
                toolType: 'creator' 
            }),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        showResult(creatorResult, data.text);

    } catch (error) {
        showResult(creatorResult, `Error: ${error.message}`);
    }
});

// 2. Hardware AI (Text-only)
hardwareForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const prompt = document.getElementById('hardware-prompt').value;
    showLoader(hardwareResult);

    try {
        const response = await fetch('/api/generate-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                prompt, 
                toolType: 'hardware' 
            }),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        showResult(hardwareResult, data.text);
    } catch (error) {
        showResult(hardwareResult, `Error: ${error.message}`);
    }
});

// 3. Branding AI (Image Generation)
brandingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const prompt = document.getElementById('branding-prompt').value;
    showLoader(brandingResult);

    try {
        const response = await fetch('/api/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.base64Data) {
            showImageResult(brandingResult, data.base64Data);
        } else {
            throw new Error(data.error || 'Failed to generate image.');
        }
    } catch (error) {
        showResult(brandingResult, `Error: ${error.message}`);
    }
});

// 4. Coaching AI (Image Analysis)
coachingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const prompt = document.getElementById('coaching-prompt').value;
    const file = document.getElementById('coaching-upload').files[0];

    if (!file) {
        showResult(coachingResult, 'Error: You must upload an image.');
        return;
    }
    showLoader(coachingResult);

    try {
        // Convert image to Base64
        const base64Image = await fileToBase64(file);
        
        const response = await fetch('/api/analyze-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                prompt, 
                base64Image,
                mimeType: file.type // e.g., 'image/jpeg'
            }),
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        showResult(coachingResult, data.text);

    } catch (error) {
        showResult(coachingResult, `Error: ${error.message}`);
    }
});

// 5. VOD Queue (Supabase Insert)
vodQueueForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    vodQueueMessage.textContent = '';
    
    const vod_url = document.getElementById('vod-url').value;
    const notes = document.getElementById('vod-notes').value;
    
    if (!currentUser) {
        vodQueueMessage.className = 'message error';
        vodQueueMessage.textContent = 'You must be logged in.';
        return;
    }

    try {
        const { data, error } = await supabase
            .from('vod_reviews') // You must create this table!
            .insert([
                { user_id: currentUser.id, video_url: vod_url, notes: notes, status: 'pending' }
            ]);

        if (error) {
            throw error;
        }

        vodQueueMessage.className = 'message success';
        vodQueueMessage.textContent = 'VOD submitted to queue successfully!';
        vodQueueForm.reset();

    } catch (error) {
        vodQueueMessage.className = 'message error';
        vodQueueMessage.textContent = `Error: ${error.message}`;
    }
});

// --- Initialization ---

async function loadUserSession() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        currentUser = session.user;
        
        // Fetch user profile (with tier)
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
            await handleLogout(); // Log out if profile is missing
        } else {
            userProfile = profile;
            updateUserInfo();
            showAppUI();
        }
    } else {
        authContainer.classList.remove('hidden');
        appContainer.classList.add('hidden');
    }
}

// Add event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Auth form toggling
    showSignup.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
        authMessage.textContent = '';
    });

    showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        signupForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        authMessage.textContent = '';
    });

    // Form submissions
    loginForm.addEventListener('submit', handleLogin);
    signupForm.addEventListener('submit', handleSignup);
    logoutButton.addEventListener('click', handleLogout);

    // App navigation
    document.querySelector('.app-nav').addEventListener('click', handleTabSwitch);

    // Initial load
    loadUserSession();
});