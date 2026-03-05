// ============================================================
//  firebase-config.js – Firebase Initialization
//  STEP: Replace ALL placeholder values below with your actual
//  Firebase project config from the Firebase Console.
//  (Project Settings > Your apps > SDK setup and configuration)
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, orderBy, query, serverTimestamp, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-analytics.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAJbbRGQQ1fl-A5_QCu1VnG6xy3ivF7ON0",
    authDomain: "it-chatbot-c74f0.firebaseapp.com",
    projectId: "it-chatbot-c74f0",
    storageBucket: "it-chatbot-c74f0.firebasestorage.app",
    messagingSenderId: "939374459795",
    appId: "1:939374459795:web:4aa6bad96efeb79f040666",
    measurementId: "G-51HHPTZC9R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// ---- Auth Helpers ----

async function loginWithGoogle() {
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (err) {
        console.error("Firebase auth error:", err);
    }
}

async function logoutUser() {
    try {
        await signOut(auth);
    } catch (err) {
        console.error("Firebase logout error:", err);
    }
}

function onAuthChange(callback) {
    onAuthStateChanged(auth, callback);
}

// ---- Firestore Helpers ----

/**
 * Creates or updates session metadata (title, timestamp) in the main 'sessions' collection.
 * @param {string} sessionId
 * @param {string} title 
 */
async function createOrUpdateSession(sessionId, title) {
    try {
        await setDoc(doc(db, "sessions", sessionId), {
            title,
            updatedAt: serverTimestamp()
        }, { merge: true });
    } catch (err) {
        console.error("Firebase: error saving session", err);
    }
}

/**
 * Loads all session metadata for the sidebar, ordered by newest first.
 * @returns {Promise<Array>}
 */
async function loadAllSessions() {
    try {
        const q = query(collection(db, "sessions"), orderBy("updatedAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
        console.error("Firebase: error loading sessions", err);
        return [];
    }
}

/**
 * Saves a single chat message to Firestore.
 * @param {string} sessionId  - Unique session identifier
 * @param {'user'|'bot'} sender
 * @param {string} text       - Plain-text content of the message
 */
async function saveMessage(sessionId, sender, text) {
    try {
        await addDoc(collection(db, "sessions", sessionId, "messages"), {
            sender,
            text,
            timestamp: serverTimestamp()
        });
    } catch (err) {
        console.error("Firebase: error saving message", err);
    }
}

/**
 * Loads all messages for a session, ordered by time.
 * @param {string} sessionId
 * @returns {Promise<Array>} Array of {sender, text, timestamp} objects
 */
async function loadMessages(sessionId) {
    try {
        const q = query(
            collection(db, "sessions", sessionId, "messages"),
            orderBy("timestamp", "asc")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data());
    } catch (err) {
        console.error("Firebase: error loading messages", err);
        return [];
    }
}

// Expose on window for script.js to use without module imports
window.firebaseAPI = {
    saveMessage,
    loadMessages,
    createOrUpdateSession,
    loadAllSessions,
    loginWithGoogle,
    logoutUser,
    onAuthChange
};
