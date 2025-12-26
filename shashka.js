import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, update, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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
const tgUserId = tg?.initDataUnsafe?.user?.id || "test_user";

const boardElement = document.getElementById('board');
const statusText = document.getElementById('game-status');
const balanceText = document.getElementById('user-balance');

let gameState = Array(8).fill(null).map(() => Array(8).fill(null));
let selectedPiece = null;
let turn = 'white'; // white - foydalanuvchi, black - AI

// Balansni realtime kuzatish
onValue(ref(db, `users/${tgUserId}/balance`), (snap) => {
    const b = snap.val() || 0;
    if (balanceText) balanceText.innerText = parseFloat(b).toFixed(6);
});

function initBoard() {
    gameState = Array(8).fill(null).map(() => Array(8).fill(null));
    for (let r = 0; r < 3; r++) {
        for (let c = (r % 2 === 0 ? 1 : 0); c < 8; c += 2) {
            gameState[r][c] = { color: 'black', king: false };
        }
    }
    for (let r = 5; r < 8; r++) {
        for (let c = (r % 2 === 0 ? 1 : 0); c < 8; c += 2) {
            gameState[r][c] = { color: 'white', king: false };
        }
    }
    renderBoard();
}

function renderBoard() {
    boardElement.innerHTML = '';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const cell = document.createElement('div');
            cell.className = `cell ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
            cell.onclick = () => handleCellClick(r, c);
            
            const piece = gameState[r][c];
            if (piece) {
                const pDiv = document.createElement('div');
                pDiv.className = `piece ${piece.color} ${piece.king ? 'king' : ''} ${selectedPiece?.r === r && selectedPiece?.c === c ? 'selected' : ''}`;
                pDiv.innerHTML = piece.king ? '👑' : '';
                cell.appendChild(pDiv);
            }
            boardElement.appendChild(cell);
        }
    }
}

function handleCellClick(r, c) {
    if (turn !== 'white') return;

    const piece = gameState[r][c];
    if (piece && piece.color === 'white') {
        selectedPiece = { r, c };
        renderBoard();
    } else if (selectedPiece) {
        if (executeMove(selectedPiece.r, selectedPiece.c, r, c)) {
            selectedPiece = null;
            turn = 'black';
            renderBoard();
            setTimeout(aiMove, 800);
        }
    }
}

function executeMove(fr, fc, tr, tc) {
    const piece = gameState[fr][fc];
    const distR = tr - fr;
    const distC = tc - fc;

    // Oddiy yurish
    if (Math.abs(distR) === 1 && Math.abs(distC) === 1 && !gameState[tr][tc]) {
        if (piece.color === 'white' && distR > 0 && !piece.king) return false;
        if (piece.color === 'black' && distR < 0 && !piece.king) return false;
        
        gameState[tr][tc] = piece;
        gameState[fr][fc] = null;
        checkKing(tr, tc);
        return true;
    }

    // Urish (Capture)
    if (Math.abs(distR) === 2 && Math.abs(distC) === 2) {
        const midR = (fr + tr) / 2;
        const midC = (fc + tc) / 2;
        const midPiece = gameState[midR][midC];

        if (midPiece && midPiece.color !== piece.color && !gameState[tr][tc]) {
            gameState[tr][tc] = piece;
            gameState[fr][fc] = null;
            gameState[midR][midC] = null;
            checkKing(tr, tc);
            return true;
        }
    }
    return false;
}

function checkKing(r, c) {
    const piece = gameState[r][c];
    if (piece.color === 'white' && r === 0) piece.king = true;
    if (piece.color === 'black' && r === 7) piece.king = true;
}

function aiMove() {
    let moves = [];
    let captures = [];

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = gameState[r][c];
            if (p?.color === 'black') {
                const dirs = [[1,1], [1,-1], [-1,1], [-1,-1]];
                dirs.forEach(([dr, dc]) => {
                    // Capture check
                    let tr = r + dr * 2, tc = c + dc * 2;
                    if (tr>=0 && tr<8 && tc>=0 && tc<8) {
                        let mr = r+dr, mc = c+dc;
                        if (gameState[mr][mc]?.color === 'white' && !gameState[tr][tc]) {
                            captures.push({fr:r, fc:c, tr, tc, mr, mc});
                        }
                    }
                    // Simple move check
                    tr = r+dr; tc = c+dc;
                    if (tr>=0 && tr<8 && tc>=0 && tc<8 && !gameState[tr][tc]) {
                        if (p.king || dr > 0) moves.push({fr:r, fc:c, tr, tc});
                    }
                });
            }
        }
    }

    const m = captures.length > 0 ? captures[0] : moves[Math.floor(Math.random() * moves.length)];
    if (m) {
        if (m.mr !== undefined) gameState[m.mr][m.mc] = null;
        gameState[m.tr][m.tc] = gameState[m.fr][m.fc];
        gameState[m.fr][m.fc] = null;
        checkKing(m.tr, m.tc);
    }
    
    turn = 'white';
    renderBoard();
    checkGameOver();
}

async function checkGameOver() {
    let w = 0, b = 0;
    gameState.flat().forEach(p => { if(p?.color === 'white') w++; if(p?.color === 'black') b++; });
    
    if (w === 0) {
        alert("Mag'lubiyat!");
        initBoard();
    } else if (b === 0) {
        await endGame("G'alaba! +0.0003 USDT", 0.0003);
    }
}

async function endGame(msg, prize) {
    const userRef = ref(db, `users/${tgUserId}`);
    const snap = await get(userRef);
    const oldBalance = snap.exists() ? (parseFloat(snap.val().balance) || 0) : 0;
    
    const newBalance = parseFloat((oldBalance + prize).toFixed(6));
    await update(userRef, { balance: newBalance });
    
    alert(msg);
    initBoard();
}

initBoard();
if (tg) { tg.expand(); tg.ready(); }