// Firebase Auth Module
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCNBSqGS4OHhiYlZXNMOVik5cZSFubsdO8",
    authDomain: "kanban-15b4d.firebaseapp.com",
    projectId: "kanban-15b4d",
    storageBucket: "kanban-15b4d.firebasestorage.app",
    messagingSenderId: "682515081754",
    appId: "1:682515081754:web:85531b424aa8699ccf3fa3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const loginScreen    = document.getElementById('loginScreen');
const appContainer   = document.querySelector('.app-container');
const googleSignInBtn = document.getElementById('googleSignInBtn');
const signOutBtn     = document.getElementById('signOutBtn');
const userAvatar     = document.getElementById('userAvatar');
const userName       = document.getElementById('userName');
const userInfo       = document.getElementById('userInfo');
const loginError     = document.getElementById('loginError');

// ── Helpers ──────────────────────────────────────────────────────────────────

function resetSignInButton() {
    googleSignInBtn.disabled = false;
    googleSignInBtn.innerHTML = `
        <svg class="google-icon" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path fill="#EA4335" d="M24 9.5c3.14 0 5.95 1.08 8.17 2.85l6.1-6.1C34.46 3.07 29.52 1 24 1 14.82 1 7.01 6.48 3.58 14.22l7.1 5.52C12.37 13.45 17.7 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.52 24.5c0-1.64-.15-3.22-.42-4.75H24v9h12.7c-.55 2.96-2.2 5.47-4.68 7.15l7.2 5.59C43.35 37.29 46.52 31.36 46.52 24.5z"/>
            <path fill="#FBBC05" d="M10.68 28.26A14.5 14.5 0 0 1 9.5 24c0-1.48.25-2.91.68-4.26l-7.1-5.52A23.94 23.94 0 0 0 0 24c0 3.87.93 7.53 2.58 10.78l8.1-6.52z"/>
            <path fill="#34A853" d="M24 47c5.52 0 10.15-1.83 13.53-4.96l-7.2-5.59c-1.83 1.23-4.17 1.96-6.33 1.96-6.3 0-11.63-3.95-13.32-9.48l-8.1 6.52C7.01 41.52 14.82 47 24 47z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
        </svg>
        Sign in with Google`;
}

function getErrorMessage(code) {
    switch (code) {
        case 'auth/popup-blocked':
            return 'Popup was blocked by your browser. Please allow popups for this site.';
        case 'auth/network-request-failed':
            return 'Network error. Please check your connection.';
        default:
            return 'Sign-in failed. Please try again.';
    }
}

// ── Auth State ────────────────────────────────────────────────────────────────

onAuthStateChanged(auth, (user) => {
    if (user) {
        loginScreen.style.display = 'none';
        appContainer.style.display = 'flex';
        userInfo.style.display = 'flex';
        userAvatar.src = user.photoURL || '';
        userAvatar.style.display = user.photoURL ? 'block' : 'none';
        userName.textContent = user.displayName || user.email;

        // Load this user's data
        currentUserId = user.uid;
        taskManager.loadFromStorage(user.uid);
        boardManager.loadFromStorage(user.uid);
        initializeBoard();
    } else {
        loginScreen.style.display = 'flex';
        appContainer.style.display = 'none';
        userInfo.style.display = 'none';
        currentUserId = null;
        resetSignInButton();
        loginError.textContent = '';
    }
});

// ── Handle redirect result on page load ──────────────────────────────────────

getRedirectResult(auth).catch((error) => {
    console.error('Redirect result error:', error);
    loginError.textContent = getErrorMessage(error.code);
    resetSignInButton();
});

// ── Sign In ───────────────────────────────────────────────────────────────────

googleSignInBtn.addEventListener('click', async () => {
    loginError.textContent = '';
    googleSignInBtn.disabled = true;
    googleSignInBtn.textContent = 'Signing in…';

    try {
        await signInWithPopup(auth, provider);
        // onAuthStateChanged will handle the UI update
    } catch (error) {
        console.error('Sign-in error:', error);

        if (error.code === 'auth/popup-blocked') {
            // Popup was blocked by the browser → fall back to redirect
            try {
                await signInWithRedirect(auth, provider);
                return; // page navigates away
            } catch (redirectError) {
                console.error('Redirect error:', redirectError);
                loginError.textContent = getErrorMessage(redirectError.code);
                resetSignInButton();
            }
        } else {
            // User closed the popup / cancelled / any other reason → just reset silently
            resetSignInButton();
        }
    }
});

// ── Sign Out ──────────────────────────────────────────────────────────────────

signOutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error('Sign-out error:', error);
    }
});
