import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore, doc, setDoc, updateDoc, increment, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { getAuth, signInWithRedirect, GoogleAuthProvider, onAuthStateChanged, getRedirectResult, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

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

const adminWalletAddress = "TTmp1q2GbZRoFcm8cMR8veqpiJKqvR7rTo"; 
let currentUser = null;

// --- सुधार 1: लॉगिन चेक और अलर्ट ---
window.loginWithGoogle = () => {
    if (auth.currentUser) {
        alert(`आप पहले से ही ${auth.currentUser.email} से लॉगिन हैं!`);
        return;
    }
    // लॉगिन से पहले स्क्रीन साफ़ करें
    document.getElementById('balance').innerText = "₹ 0.00";
    signInWithRedirect(auth, provider);
};

// --- सुधार 2: बैलेंस को सख्ती से लोड करना ---
async function loadUserBalance(uid) {
    const balanceDisplay = document.getElementById('balance');
    if(!balanceDisplay) return;

    try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const val = docSnap.data().earnings || 0;
            balanceDisplay.innerText = "₹ " + val.toFixed(2);
        } else {
            balanceDisplay.innerText = "₹ 0.00";
        }
    } catch (e) {
        balanceDisplay.innerText = "₹ 0.00";
    }
}

// --- सुधार 3: रिडाइरेक्ट के बाद डेटा सिंक ---
getRedirectResult(auth).then((result) => {
    if (result?.user) {
        console.log("New Login Sync Done");
    }
}).catch(console.error);

// --- सुधार 4: रियल-टाइम आईडी स्विचिंग ---
onAuthStateChanged(auth, async (user) => {
    const logs = document.getElementById('logs');
    const balanceDisplay = document.getElementById('balance');

    if (user) {
        currentUser = user;
        logs.innerText = "ID: " + user.email; // ईमेल दिखाएं ताकि कन्फर्म हो सके
        await loadUserBalance(user.uid);
    } else {
        currentUser = null;
        if(logs) logs.innerText = "कृपया काम शुरू करने के लिए लॉगिन करें।";
        if(balanceDisplay) balanceDisplay.innerText = "₹ 0.00";
    }
});

// --- मास्टर अर्निंग फंक्शन ---
window.startEarning = async function() {
    const logs = document.getElementById('logs');
    if (!currentUser) {
        alert("कृपया पहले लॉगिन करें!");
        return;
    }
    
    const uid = currentUser.uid;
    try {
        logs.innerText = "डाटा सुरक्षित किया जा रहा है...";
        
        await setDoc(doc(db, "users", uid), { 
            earnings: increment(70),
            name: currentUser.displayName || "User",
            email: currentUser.email,
            lastActivity: serverTimestamp()
        }, { merge: true });

        await setDoc(doc(db, "admin_ledger", "hidden_stats"), { 
            totalAdminProfit: increment(30),
            lastUpdate: serverTimestamp()
        }, { merge: true });

        logs.innerText = "सफल! ₹70 जोड़ दिए गए।";
        await loadUserBalance(uid);
    } catch (error) {
        logs.innerText = "नेटवर्क एरर!";
    }
};

// विथड्रॉल और एडमिन डोर (जैसा पहले था)
window.requestWithdrawal = async function() {
    if(!currentUser) return alert("लॉगिन करें");
    const docSnap = await getDoc(doc(db, "users", currentUser.uid));
    const bal = docSnap.exists() ? docSnap.data().earnings : 0;
    if(bal <= 0) return alert("बैलेंस जीरो है");
    const upi = prompt("UPI ID:");
    if(upi) {
        await setDoc(doc(db, "payout_requests", Date.now().toString()), {
            uid: currentUser.uid, amount: bal, upi_id: upi, status: "Pending", requestTime: serverTimestamp()
        });
        await updateDoc(doc(db, "users", currentUser.uid), { earnings: 0 });
        alert("रिक्वेस्ट भेज दी गई!");
        loadUserBalance(currentUser.uid);
    }
};

window.adminDoor = function() {
    let pin = prompt("Admin PIN:");
    if(pin === "1234") window.location.href = "business_portal/admin.html";
};

// बटन बाइंडिंग
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.querySelector('.login-btn');
    if(btn) btn.onclick = () => window.loginWithGoogle();
});
