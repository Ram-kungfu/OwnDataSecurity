import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore, doc, setDoc, updateDoc, increment, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { getAuth, signInWithRedirect, GoogleAuthProvider, onAuthStateChanged, getRedirectResult } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

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

// --- 1. लॉगिन रिजल्ट चेक करना (Redirect के बाद) ---
getRedirectResult(auth)
  .then((result) => {
    if (result?.user) {
      console.log("Login Success after redirect");
      currentUser = result.user;
    }
  })
  .catch((error) => console.error("Redirect Error:", error));

// --- 2. बैलेंस लोड फंक्शन ---
async function loadUserBalance(uid) {
    const balanceDisplay = document.getElementById('balance');
    if(!balanceDisplay) return;
    try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            balanceDisplay.innerText = "₹ " + (docSnap.data().earnings || 0).toFixed(2);
        } else {
            balanceDisplay.innerText = "₹ 0.00";
        }
    } catch (e) { console.error(e); }
}

// --- 3. रियल-टाइम लॉगिन चेक ---
onAuthStateChanged(auth, (user) => {
    const logs = document.getElementById('logs');
    const balanceDisplay = document.getElementById('balance');
    
    if (user) {
        currentUser = user;
        if(logs) logs.innerText = "ID: " + user.email;
        loadUserBalance(user.uid);
    } else {
        currentUser = null;
        if(logs) logs.innerText = "कृपया काम शुरू करने के लिए लॉगिन करें।";
        if(balanceDisplay) balanceDisplay.innerText = "₹ 0.00";
    }
});

// --- 4. रियल अर्निंग फंक्शन (Fake नहीं, Real DB Update) ---
window.startEarning = async function() {
    const logs = document.getElementById('logs');
    
    // अगर currentUser अभी भी लोड नहीं हुआ है
    if (!currentUser) {
        alert("सिस्टम आईडी लोड कर रहा है, कृपया 2 सेकंड रुकें या फिर से लॉगिन करें।");
        return;
    }

    try {
        if(logs) logs.innerText = "डाटा सुरक्षित हो रहा है...";
        
        // यूजर के खाते में ₹70 जोड़ना
        await setDoc(doc(db, "users", currentUser.uid), { 
            earnings: increment(70),
            email: currentUser.email,
            lastActivity: serverTimestamp()
        }, { merge: true });

        // एडमिन के खाते में ₹30 जोड़ना
        await setDoc(doc(db, "admin_ledger", "hidden_stats"), { 
            totalAdminProfit: increment(30),
            lastUpdate: serverTimestamp()
        }, { merge: true });

        if(logs) logs.innerText = "बधाई! ₹70 जुड़ गए।";
        loadUserBalance(currentUser.uid);
    } catch (error) {
        console.error(error);
        alert("नेटवर्क एरर! अपना इंटरनेट चेक करें।");
    }
};

// --- 5. बटनों को जोड़ना ---
document.addEventListener('DOMContentLoaded', () => {
    // लॉगिन बटन
    const loginBtn = document.querySelector('.login-btn') || document.querySelector('[onclick*="loginWithGoogle"]');
    if(loginBtn) {
        loginBtn.onclick = () => {
            if(!auth.currentUser) signInWithRedirect(auth, provider);
            else alert("आप पहले से लॉगिन हैं।");
        };
    }

    // अर्निंग बटन (Real ID के साथ)
    const earnBtn = document.querySelector('.earn-btn') || document.querySelector('.data-safe-btn');
    if(earnBtn) earnBtn.onclick = () => window.startEarning();
});
