import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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
const balanceEl = document.getElementById('user-balance');
const welcomeMsg = document.getElementById('welcome-msg');

const tgUser = tg?.initDataUnsafe?.user;
const userId = tgUser?.id || "test_user"; 
const userName = tgUser?.first_name || "Foydalanuvchi";

if (welcomeMsg) {
    welcomeMsg.innerText = `Xush kelibsiz, ${userName}!`;
}

// Balansni Realtime o'qish
const balanceRef = ref(db, 'users/' + userId + '/balance');
onValue(balanceRef, (snapshot) => {
    const data = snapshot.val();
    const currentBalance = data !== null ? parseFloat(data).toFixed(6) : "0.000000";
    if (balanceEl) balanceEl.innerText = currentBalance;
});

// Tugmalarga event qo'shish
document.getElementById('shashka-btn')?.addEventListener('click', () => window.location.href = 'shashka.html');
document.getElementById('mines-btn')?.addEventListener('click', () => window.location.href = 'mines.html');
document.getElementById('crash-btn')?.addEventListener('click', () => window.location.href = 'crash.html');

if (tg) { tg.expand(); tg.ready(); }