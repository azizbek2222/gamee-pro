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

const AdController = window.Adsgram?.init({ blockId: "int-20012" }); 

let gameState = "waiting";
let currentMultiplier = 1.00;
let lastRoundId = "";
let userHasCashedOutInThisRound = false;

// 1. Foydalanuvchi balansini va joriy raunddagi cashout holatini kuzatish
onValue(ref(db, `users/${userId}`), (snap) => {
    const userData = snap.val();
    if (userData) {
        if (balanceEl) balanceEl.innerText = parseFloat(userData.balance || 0).toFixed(6);
        // Bazadagi holatni tekshiramiz
        userHasCashedOutInThisRound = userData.lastCashedRound === lastRoundId;
    }
});

// 2. O'yin holatini kuzatish
const gameRef = ref(db, 'crash_game');
onValue(gameRef, (snap) => {
    const data = snap.val();
    if (!data) return;
    
    // Raund o'zgarganini aniqlash (lastUpdate orqali)
    const currentRoundId = data.lastUpdate.toString();
    if (lastRoundId !== currentRoundId) {
        lastRoundId = currentRoundId;
        // Yangi raund boshlanganda local holatni yangilaymiz
        // userHasCashedOutInThisRound Firebase orqali o'z-o'zidan yangilanadi
    }

    if (gameState !== "crashed" && data.state === "crashed") {
        showAdAfterCrash();
    }

    currentMultiplier = data.multiplier;
    gameState = data.state;
    updateUI();
});

function showAdAfterCrash() {
    if (AdController) {
        AdController.show().catch((err) => console.log("Ad error", err));
    }
}

function updateUI() {
    const displayArea = document.getElementById('display-area');
    
    if (gameState === "flying") {
        displayArea.classList.add('flying');
        multiplierEl.innerText = currentMultiplier.toFixed(2) + "x";
        multiplierEl.style.color = "#fff";
        statusEl.innerText = "RAKETA PARVOZDA...";
        
        let shift = (currentMultiplier - 1) * 15;
        rocketEl.style.transform = `translate(${shift}px, -${shift}px) rotate(-45deg)`;

        // ASOSIY TEKSHIRUV: Agar foydalanuvchi ushbu raundda pul olgan bo'lsa (Firebase ma'lumoti)
        if (userHasCashedOutInThisRound) {
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
    } else if (gameState === "waiting") {
        displayArea.classList.remove('flying');
        multiplierEl.innerText = "1.00x";
        multiplierEl.style.color = "#fff";
        statusEl.innerText = "TAYYORLANMOQDA...";
        cashoutBtn.style.display = 'none';
        rocketEl.style.transform = "translate(0,0) rotate(-45deg) scale(1)";
    }
}

// 3. Cash Out funksiyasi - Firebase-ga raund ID-sini yozish bilan
cashoutBtn.addEventListener('click', async () => {
    if (gameState !== "flying" || userHasCashedOutInThisRound) return;
    
    // Tugmani darhol yashiramiz (UI tezligi uchun)
    cashoutBtn.style.display = 'none';
    userHasCashedOutInThisRound = true;

    const winAmount = currentMultiplier * 0.0001;
    
    try {
        const userRef = ref(db, `users/${userId}`);
        const snap = await get(userRef);
        const userData = snap.val() || { balance: 0 };
        const oldBalance = parseFloat(userData.balance) || 0;
        
        // Balansni yangilash va ushbu raundda pul olganini bazaga muhrlash
        await update(userRef, { 
            balance: parseFloat((oldBalance + winAmount).toFixed(6)),
            lastCashedRound: lastRoundId // Ushbu foydalanuvchi uchun raundni band qilamiz
        });
        
        statusEl.innerText = `YUTUQ: +${winAmount.toFixed(6)} USDT`;
        statusEl.style.color = "#10b981";
    } catch (e) {
        console.error("Xato:", e);
        userHasCashedOutInThisRound = false; 
    }
});

// 4. Admin Sinxronizator (O'yinni boshqarish)
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