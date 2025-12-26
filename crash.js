import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, update, get, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyA7VLHdjPqf_tobSiBczGbN8H7YlFwq9Wg",
    authDomain: "magnetic-alloy-467611-u7.firebaseapp.com",
    databaseURL: "https://magnetic-alloy-467611-u7-default-rtdb.firebaseio.com",
    projectId: "magnetic-alloy-467611-u7",
    storageBucket: "magnetic-alloy-467611-u7.firebasestorage.app",
    messagingSenderId: "589500919880",
    appId: "1:589500919880:web:3bb0beedf38b373951687d"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const tg = window.Telegram?.WebApp;
const userId = tg?.initDataUnsafe?.user?.id || "test_user";

const multiplierEl = document.getElementById('multiplier');
const rocketEl = document.getElementById('rocket');
const statusEl = document.getElementById('game-status');
const cashoutBtn = document.getElementById('cashout-btn');
const potentialWinEl = document.getElementById('potential-win');
const balanceEl = document.getElementById('user-balance');

// AdsGram
const AdController = window.Adsgram?.init({ blockId: "int-20012" }); 

let gameState = "waiting";
let currentMultiplier = 1.00;
let hasCashedOut = false;
let lastRoundTimestamp = 0; // Har bir raundni unikal vaqt bilan belgilaymiz

// Balansni kuzatish
onValue(ref(db, `users/${userId}/balance`), (snap) => {
    const val = snap.val() || 0;
    if (balanceEl) balanceEl.innerText = parseFloat(val).toFixed(6);
});

// O'yin holatini kuzatish
const gameRef = ref(db, 'crash_game');
onValue(gameRef, (snap) => {
    const data = snap.val();
    if (!data) return;
    
    // Yangi raund boshlanganini tekshirish
    if (data.lastUpdate !== lastRoundTimestamp) {
        // Agar o'yin waiting holatiga o'tsa yoki yangi parvoz boshlansa
        if (data.state === "waiting" || (gameState === "crashed" && data.state === "flying")) {
            hasCashedOut = false; // Faqat yangi raundda cashoutni ruxsat beramiz
        }
        lastRoundTimestamp = data.lastUpdate;
    }

    // Reklama ko'rsatish mantiqi
    if (gameState !== "crashed" && data.state === "crashed") {
        showAdAfterCrash();
    }

    currentMultiplier = data.multiplier;
    gameState = data.state;
    updateUI();
});

function showAdAfterCrash() {
    if (AdController) {
        AdController.show()
            .then(() => console.log("Ad shown"))
            .catch((err) => console.log("Ad error", err));
    }
}

function updateUI() {
    const displayArea = document.getElementById('display-area');
    
    if (gameState === "flying") {
        displayArea.classList.add('flying');
        multiplierEl.innerText = currentMultiplier.toFixed(2) + "x";
        multiplierEl.style.color = "#fff";
        statusEl.innerText = "RAKETA PARVOZDA...";
        
        // Raketa harakati
        let shift = (currentMultiplier - 1) * 15;
        rocketEl.style.transform = `translate(${shift}px, -${shift}px) rotate(-45deg)`;

        // ASOSIY TUZATISH: Agar ushbu raundda pul olingan bo'lsa, tugma mutlaqo chiqmaydi
        if (hasCashedOut) {
            cashoutBtn.style.display = 'none';
        } else {
            cashoutBtn.style.display = 'block';
            potentialWinEl.innerText = (currentMultiplier * 0.0001).toFixed(6);
        }
    } else if (gameState === "crashed") {
        displayArea.classList.remove('flying');
        multiplierEl.style.color = "#ef4444";
        statusEl.innerText = "BOOM! " + currentMultiplier.toFixed(2) + "x";
        cashoutBtn.style.display = 'none';
        rocketEl.style.transform = "scale(0)";
        // Raund tugadi, lekin hasCashedOut ni hali reset qilmaymiz (waiting bo'lguncha)
    } else if (gameState === "waiting") {
        displayArea.classList.remove('flying');
        multiplierEl.innerText = "1.00x";
        multiplierEl.style.color = "#fff";
        statusEl.innerText = "TAYYORLANMOQDA...";
        cashoutBtn.style.display = 'none';
        rocketEl.style.transform = "translate(0,0) rotate(-45deg) scale(1)";
        hasCashedOut = false; // Kutish vaqtida keyingi o'yin uchun ochamiz
    }
}

// Cash Out funksiyasi
cashoutBtn.addEventListener('click', async () => {
    // Agar allaqachon pul olingan bo'lsa yoki uchmayotgan bo'lsa rad etish
    if (hasCashedOut || gameState !== "flying") return;
    
    hasCashedOut = true; // Local holatni darhol true qilamiz
    cashoutBtn.style.display = 'none'; // Tugmani darhol yashiramiz

    const winAmount = currentMultiplier * 0.0001;
    
    try {
        const userRef = ref(db, `users/${userId}`);
        const snap = await get(userRef);
        const oldBalance = snap.exists() ? (parseFloat(snap.val().balance) || 0) : 0;
        
        await update(userRef, { balance: parseFloat((oldBalance + winAmount).toFixed(6)) });
        
        statusEl.innerText = `YUTUQ: +${winAmount.toFixed(6)} USDT`;
        statusEl.style.color = "#10b981";
    } catch (e) {
        console.error("Xato:", e);
        // Xatolik bo'lsa foydalanuvchiga qayta urinish imkonini berish uchun:
        // hasCashedOut = false; 
    }
});

// Admin Sinxronizator
setInterval(async () => {
    const snap = await get(gameRef);
    const data = snap.val();
    if (!data || data.lastUpdate < Date.now() - 2000) {
        if (!data || data.state === "crashed") {
            set(gameRef, { state: "waiting", multiplier: 1.00, lastUpdate: Date.now() });
            setTimeout(() => {
                set(gameRef, { 
                    state: "flying", 
                    multiplier: 1.00, 
                    lastUpdate: Date.now(), 
                    crashAt: (Math.random() * 4 + 1.1).toFixed(2) 
                });
            }, 3000);
        } else if (data.state === "flying") {
            const nextM = data.multiplier + 0.08;
            if (nextM >= parseFloat(data.crashAt)) {
                set(gameRef, { state: "crashed", multiplier: data.multiplier, lastUpdate: Date.now() });
            } else {
                update(gameRef, { multiplier: nextM, lastUpdate: Date.now() });
            }
        }
    }
}, 100);

if (tg) { tg.expand(); tg.ready(); }