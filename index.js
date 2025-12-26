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

// Firebase-ni ishga tushirish
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Telegram WebApp obyektini olish
const tg = window.Telegram?.WebApp;
const balanceEl = document.getElementById('user-balance');
const welcomeMsg = document.getElementById('welcome-msg');

// Telegramdan foydalanuvchi ma'lumotlarini olish
// Agar brauzerda test qilayotgan bo'lsangiz 'test_user' ishlatiladi
const tgUser = tg?.initDataUnsafe?.user;
const userId = tgUser?.id || "test_user"; 
const userName = tgUser?.first_name || "Foydalanuvchi";

// Sahifada ismni ko'rsatish
if (welcomeMsg) {
    welcomeMsg.innerText = `Xush kelibsiz, ${userName}!`;
}

// Balansni Telegram ID orqali Realtime Database-dan olish
const balanceRef = ref(db, 'users/' + userId + '/balance');
onValue(balanceRef, (snapshot) => {
    const data = snapshot.val();
    // Agar balans bo'lmasa 0.00000 deb ko'rsatadi
    const currentBalance = data !== null ? parseFloat(data).toFixed(5) : "0.00000";
    
    if (balanceEl) {
        balanceEl.innerText = currentBalance;
    }
}, (error) => {
    console.error("Balansni yuklashda xato:", error);
});

// O'yinni ochish funksiyasi
window.openGame = (game) => {
    if (game === 'shashka') {
        window.location.href = 'shashka.html';
    }
};

// Shashka tugmasiga hodisa bog'lash
const shashkaBtn = document.getElementById('shashka-btn');
if (shashkaBtn) {
    shashkaBtn.addEventListener('click', () => openGame('shashka'));
}

// Telegram Mini App-ni to'liq ekranga yoyish
if (tg) {
    tg.expand();
    tg.ready();
}
