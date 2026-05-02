import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore, doc, setDoc, updateDoc, increment, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

// --- Firebase Config (यही रहेगा) ---
const firebaseConfig = {
  apiKey: "AIzaSyBiKNkadH-myaJ2TqxIQ4iVIC7eVt_beoM",
  authDomain: "owndata-3a3d4.firebaseapp.com",
  projectId: "owndata-3a3d4",
  storageBucket: "owndata-3a3d4.firebasestorage.app",
  messagingSenderId: "940915720247",
  appId: "1:940915720247:web:61f057e78c3ef7f11ebfb2",
  measurementId: "G-YKS0NGSN0Z"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

let currentUser = null;

// --- सुधार: ब्राउज़र को लॉगिन याद रखने के लिए मजबूर करना ---
setPersistence(auth, browserLocalPersistence);

// --- बैलेंस लोड फंक्शन ---
async function loadUserBalance(uid) {
    const balanceDisplay = document.getElementById('balance');
    if(!balanceDisplay) return;
    try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            balanceDisplay.innerText = "₹ " + (docSnap.data().earnings || 0).toFixed(2);
        }
    } catch (e) { console.error("Balance Error", e); }
}

// --- ऑटोमैटिक लॉगिन ट्रैकिंग ---
onAuthStateChanged(auth, (user) => {
    const logs = document.getElementById('logs');
    if (user) {
        currentUser = user;
        if(logs) logs.innerText = "आईडी: " + user.email;
        loadUserBalance(user.uid);
    } else {
        currentUser = null;
        if(logs) logs.innerText = "कृपया लॉगिन करें।";
    }
});

// --- लॉगिन बटन (विंडो ऑब्जेक्ट पर सेट ताकि HTML से काम करे) ---
window.loginWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        currentUser = result.user;
        alert("लॉगिन सफल!");
    } catch (error) {
        alert("लॉगिन फेल! ब्राउज़र की कुकीज़ चेक करें।");
    }
};

// --- अर्निंग बटन (70/30 बँटवारा) ---
window.startEarning = async function() {
    const logs = document.getElementById('logs');
    if (!currentUser) {
        alert("सिस्टम आईडी लोड नहीं हुई है। कृपया पहले लॉगिन करें।");
        return;
    }
    try {
        if(logs) logs.innerText = "डाटा सुरक्षित हो रहा है...";
        await setDoc(doc(db, "users", currentUser.uid), { 
            earnings: increment(70),
            email: currentUser.email,
            lastActivity: serverTimestamp()
        }, { merge: true });

        await setDoc(doc(db, "admin_ledger", "hidden_stats"), { 
            totalAdminProfit: increment(30),
            lastUpdate: serverTimestamp()
        }, { merge: true });

        if(logs) logs.innerText = "सफल! ₹70 जुड़ गए।";
        loadUserBalance(currentUser.uid);
    } catch (error) {
        alert("Firebase Rules की वजह से पैसा ऐड नहीं हुआ।");
    }
};

// --- बटन और क्लिक इवेंट्स को ऑटोमैटिक जोड़ना ---
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('login-btn')) window.loginWithGoogle();
    if (e.target.classList.contains('data-safe-btn') || e.target.classList.contains('earn-btn')) window.startEarning();
});
