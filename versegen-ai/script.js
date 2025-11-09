// This script assumes window.supabase is initialized in index.html

const supabase = window.supabase;

// --- DOM Elements ---
const landingContainer = document.getElementById('landing-container');
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const authMessage = document.getElementById('auth-message');
const globalMessage = document.getElementById('global-message');

// Auth/Navigation Elements
const authFormContainer = document.getElementById('auth-forms');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const logoutButton = document.getElementById('logout-button');
const navButtons = document.querySelectorAll('.nav-btn');
const tabs = document.querySelectorAll('.tab-content');

// User Info Elements
const userEmailEl = document.getElementById('user-email');
const userTierBadge = document.getElementById('user-tier-badge');
const userTierText = document.getElementById('user-tier-text');

// AI Feature Elements (Ensure they are accessible)
const coachingForm = document.getElementById('coaching-form');
const coachingResult = document.getElementById('coaching-result');
const creatorForm = document.getElementById('creator-form');
const hardwareForm = document.getElementById('hardware-form');
const brandingForm = document.getElementById('branding-form');
const brandingResult = document.getElementById('branding-result');
const vodQueueForm = document.getElementById('vod-queue-form');
const vodQueueMessage = document.getElementById('vod-queue-message');


// State
let currentUser = null;
let userProfile = null;
const TIER_ORDER = { 'free': 0, 'paid': 1, 'elite': 2 };

// --- Utility Functions ---

/**
 * Displays a non-blocking toast message.
 */
function showGlobalMessage(type, message) {
    globalMessage.textContent = message;
    globalMessage.className = `global-message ${type}`;
    globalMessage.classList.add('show');
    setTimeout(() => {
        globalMessage.classList.remove('show');
    }, 3500);
}

/**
 * Toggles visibility of forms/containers.
 */
function setView(view) {
    landingContainer.classList.add('hidden');
    authContainer.classList.add('hidden');
    appContainer.classList.add('hidden');

    if (view === 'landing') {
        landingContainer.classList.remove('hidden');
    } else if (view === 'auth') {
        authContainer.classList.remove('hidden');
        authMessage.textContent = ''; // Clear auth message on view switch
    } else if (view === 'app') {
        appContainer.classList.remove('hidden');
    }
}

function showAuthForm(isSignup) {
    loginForm.classList.toggle('hidden', isSignup);
    signupForm.classList.toggle('hidden', !isSignup);
}

function showAuthMessage(type, message) {
    authMessage.textContent = message;
    authMessage.className = `message ${type}`;
}

/**
 * Converts a file to Base64 string for API transmission.
 * @returns {Promise<string>} - Base64 string (without the data prefix).
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
}

// --- Auth & Profile Management ---

async function loadUserSession() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        currentUser = session.user;
        await fetchUserProfile(currentUser.id);
    } else {
        currentUser = null;
        userProfile = null;
        setView('landing');
    }
}

async function fetchUserProfile(userId) {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error fetching profile:', error);
        showGlobalMessage('error', 'Could not load user profile. Please try logging in again.');
        await handleLogout();
    } else {
        userProfile = profile;
        updateAppUI();
        setView('app');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        showAuthMessage('error', error.message);
    } else {
        showAuthMessage('success', 'Logged in successfully! Loading hub...');
        // Wait briefly for Supabase to update the session before reloading
        setTimeout(loadUserSession, 500); 
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
        showAuthMessage('error', error.message);
    } else {
        showAuthMessage('success', 'Account created! Please check your email for a confirmation link to log in.');
        signupForm.reset();
        showAuthForm(false); // Switch back to login
    }
}

async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        showGlobalMessage('error', error.message);
    } else {
        currentUser = null;
        userProfile = null;
        showGlobalMessage('success', 'Logged out successfully.');
        setView('landing');
    }
}

// --- App UI & Feature Locking ---

function updateAppUI() {
    if (!currentUser || !userProfile) return;

    userEmailEl.textContent = currentUser.email;
    userTierBadge.textContent = userProfile.tier;
    userTierText.textContent = userProfile.tier.toUpperCase() + ' Version';
    userTierBadge.className = `badge ${userProfile.tier}`;

    // Apply feature locks
    const userTierValue = TIER_ORDER[userProfile.tier];

    navButtons.forEach(btn => {
        const requiredTier = btn.dataset.tier || 'free';
        const requiredTierValue = TIER_ORDER[requiredTier];
        const targetTabId = btn.dataset.target;
        const targetTab = document.getElementById(targetTabId);

        if (userTierValue >= requiredTierValue) {
            btn.classList.add('unlocked');
            if (targetTab) targetTab.classList.remove('locked');
        } else {
            btn.classList.remove('unlocked');
            if (targetTab) targetTab.classList.add('locked');
        }
    });
}

function handleTabSwitch(e) {
    const targetButton = e.target.closest('.nav-btn');
    if (!targetButton) return;
    
    const targetTabId = targetButton.dataset.target;
    const targetTab = document.getElementById(targetTabId);

    if (targetTab.classList.contains('locked')) {
        showGlobalMessage('error', `This feature is locked. You need the ${targetTab.querySelector('.lock-overlay p').textContent.match(/\*\*(\w+)\*\*/)[1]} tier.`);
        return;
    }

    // Switch tabs
    navButtons.forEach(btn => btn.classList.remove('active'));
    targetButton.classList.add('active');

    tabs.forEach(tab => tab.classList.remove('active'));
    targetTab.classList.add('active');
}


// --- AI Backend Handlers ---

function showLoader(resultBox) {
    resultBox.querySelector('.loader').classList.remove('hidden');
    resultBox.querySelector('.ai-result-content').textContent = '';
    const img = resultBox.querySelector('.ai-result-image');
    if (img) img.classList.add('hidden');
}

function showResult(resultBox, text, isError = false) {
    resultBox.querySelector('.loader').classList.add('hidden');
    const contentEl = resultBox.querySelector('.ai-result-content');
    contentEl.textContent = text;
    contentEl.style.color = isError ? 'var(--error)' : 'var(--light-gray)';
}

function showImageResult(resultBox, base64Data) {
    resultBox.querySelector('.loader').classList.add('hidden');
    const img = resultBox.querySelector('.ai-result-image');
    img.src = `data:image/png;base64,${base64Data}`;
    img.classList.remove('hidden');
}

// Handler for all text generation (Creator AI, Hardware AI, Calendar AI)
async function handleTextGeneration(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const resultBox = form.nextElementSibling || form.parentNode.querySelector('.ai-result-box');
    const promptId = form.querySelector('textarea').id;
    const prompt = document.getElementById(promptId).value;
    const toolType = form.id.replace('-form', '');

    showLoader(resultBox);
    showResult(resultBox, 'Generating response...');

    try {
        const response = await fetch('/api/generate-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, toolType }),
        });
        
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Server responded with status ${response.status}`);
        }
        
        showResult(resultBox, data.text);

    } catch (error) {
        showResult(resultBox, `Error: ${error.message}. Please check your prompt or try again.`, true);
    }
}

// Handler for Image Generation (Branding AI)
async function handleImageGeneration(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const resultBox = brandingResult;
    const prompt = document.getElementById('branding-prompt').value;
    
    showLoader(resultBox);
    showResult(resultBox, 'Generating image. This may take up to 30 seconds...');

    try {
        const response = await fetch('/api/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
        });
        
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Server responded with status ${response.status}`);
        }

        if (data.base64Data) {
            showImageResult(resultBox, data.base64Data);
        } else {
            throw new Error('Image generation failed to return data.');
        }

    } catch (error) {
        showResult(resultBox, `Image Error: ${error.message}`, true);
        resultBox.querySelector('.ai-result-image').classList.add('hidden'); // Ensure image element is hidden on error
    }
}

// Handler for Image Analysis (Coaching AI)
async function handleImageAnalysis(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = document.getElementById('coaching-upload');
    const file = fileInput.files[0];
    const prompt = document.getElementById('coaching-prompt').value;
    const resultBox = coachingResult;
    
    if (!file) {
        showResult(resultBox, 'Please upload a screenshot for analysis.', true);
        return;
    }

    showLoader(resultBox);
    showResult(resultBox, 'Uploading and analyzing gameplay VOD screenshot...');

    try {
        const base64Image = await fileToBase64(file);
        
        const response = await fetch('/api/analyze-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                prompt, 
                base64Image,
                mimeType: file.type
            }),
        });
        
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Server responded with status ${response.status}`);
        }
        
        showResult(resultBox, data.text);

    } catch (error) {
        showResult(resultBox, `Analysis Error: ${error.message}`, true);
    }
}

// Handler for Elite VOD Queue Submission (Supabase)
async function handleVodQueueSubmission(e) {
    e.preventDefault();
    
    const vodUrl = document.getElementById('vod-url').value;
    const notes = document.getElementById('vod-notes').value;
    
    if (!currentUser || userProfile.tier !== 'elite') {
        vodQueueMessage.className = 'message error';
        vodQueueMessage.textContent = 'You must be logged in as an Elite member to submit.';
        return;
    }

    vodQueueMessage.className = '';
    vodQueueMessage.textContent = 'Submitting...';

    try {
        // 'vod_reviews' table was created in Step 1 of the guide
        const { error } = await supabase
            .from('vod_reviews') 
            .insert([
                { 
                    user_id: currentUser.id, 
                    video_url: vodUrl, 
                    notes: notes
                }
            ]);

        if (error) {
            throw error;
        }

        vodQueueMessage.className = 'message success';
        vodQueueMessage.textContent = 'VOD submitted successfully! Guaranteed 24-hour turnaround.';
        vodQueueForm.reset();

    } catch (error) {
        vodQueueMessage.className = 'message error';
        vodQueueMessage.textContent = `Submission Error: ${error.message}.`;
    }
}

// --- Event Listeners and Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Load and Auth Check
    loadUserSession(); 
    
    // 2. Auth Form Toggles
    document.getElementById('show-auth-free').addEventListener('click', () => setView('auth'));
    document.getElementById('show-auth-login').addEventListener('click', (e) => { e.preventDefault(); setView('auth'); showAuthForm(false); });
    document.getElementById('back-to-landing').addEventListener('click', (e) => { e.preventDefault(); setView('landing'); });
    document.getElementById('show-signup').addEventListener('click', (e) => { e.preventDefault(); showAuthForm(true); });
    document.getElementById('show-login').addEventListener('click', (e) => { e.preventDefault(); showAuthForm(false); });

    // 3. Auth Submission
    loginForm.addEventListener('submit', handleLogin);
    signupForm.addEventListener('submit', handleSignup);
    logoutButton.addEventListener('click', handleLogout);

    // 4. App Navigation
    document.querySelector('.app-nav').addEventListener('click', handleTabSwitch);

    // 5. AI Form Submissions (Text Generation)
    creatorForm.addEventListener('submit', handleTextGeneration);
    hardwareForm.addEventListener('submit', handleTextGeneration);
    document.getElementById('calendar-form').addEventListener('submit', handleTextGeneration);
    
    // 6. AI Form Submissions (Image Generation/Analysis)
    brandingForm.addEventListener('submit', handleImageGeneration);
    coachingForm.addEventListener('submit', handleImageAnalysis);

    // 7. Elite Supabase Submission
    vodQueueForm.addEventListener('submit', handleVodQueueSubmission);
});
