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

let gameState = "waiting";
let currentMultiplier = 1.00;
let hasCashedOut = false;

// Balansni kuzatish
onValue(ref(db, `users/${userId}/balance`), (snap) => {
    const val = snap.val() || 0;
    balanceEl.innerText = parseFloat(val).toFixed(6);
});

// O'yin holatini kuzatish (Multiplayer)
const gameRef = ref(db, 'crash_game');
onValue(gameRef, (snap) => {
    const data = snap.val();
    if (!data) return;
    currentMultiplier = data.multiplier;
    gameState = data.state;
    updateUI();
});

function updateUI() {
    if (gameState === "flying") {
        multiplierEl.innerText = currentMultiplier.toFixed(2) + "x";
        statusEl.innerText = "RAKETA PARVOZDA...";
        rocketEl.style.transform = `scale(${1 + (currentMultiplier-1)*0.1}) rotate(-45deg)`;
        if (!hasCashedOut) {
            cashoutBtn.style.display = 'block';
            potentialWinEl.innerText = (currentMultiplier * 0.00001).toFixed(6);
        }
    } else if (gameState === "crashed") {
        multiplierEl.style.color = "#ef4444";
        statusEl.innerText = "BOOM! " + currentMultiplier.toFixed(2) + "x";
        cashoutBtn.style.display = 'none';
        rocketEl.style.transform = "scale(0)";
        hasCashedOut = false;
    } else if (gameState === "waiting") {
        multiplierEl.innerText = "1.00x";
        multiplierEl.style.color = "#fff";
        statusEl.innerText = "TAYYORLANMOQDA...";
        cashoutBtn.style.display = 'none';
        rocketEl.style.transform = "scale(1) rotate(-45deg)";
    }
}

// Cash Out funksiyasi
cashoutBtn.addEventListener('click', async () => {
    if (gameState !== "flying" || hasCashedOut) return;
    hasCashedOut = true;
    const winAmount = currentMultiplier * 0.00001;
    
    const userRef = ref(db, `users/${userId}`);
    const snap = await get(userRef);
    const oldBalance = snap.exists() ? (parseFloat(snap.val().balance) || 0) : 0;
    
    await update(userRef, { balance: parseFloat((oldBalance + winAmount).toFixed(6)) });
    cashoutBtn.style.display = 'none';
    statusEl.innerText = `YUTUQ: +${winAmount.toFixed(6)} USDT`;
});

// Admin Sinxronizator (Sekundiga 10 marta yangilaydi)
setInterval(async () => {
    const snap = await get(gameRef);
    const data = snap.val();
    if (!data || data.lastUpdate < Date.now() - 2000) {
        if (!data || data.state === "crashed") {
            set(gameRef, { state: "waiting", multiplier: 1.00, lastUpdate: Date.now() });
            setTimeout(() => set(gameRef, { state: "flying", multiplier: 1.00, lastUpdate: Date.now(), crashAt: (Math.random() * 4 + 1.1).toFixed(2) }), 3000);
        } else if (data.state === "flying") {
            const nextM = data.multiplier + 0.08; // Tezlashtirilgan
            if (nextM >= parseFloat(data.crashAt)) set(gameRef, { state: "crashed", multiplier: data.multiplier, lastUpdate: Date.now() });
            else update(gameRef, { multiplier: nextM, lastUpdate: Date.now() });
        }
    }
}, 100);