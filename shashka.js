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

// Telegram foydalanuvchi ID raqamini olish
const tg = window.Telegram?.WebApp;
const tgUserId = tg?.initDataUnsafe?.user?.id || "test_user"; // Telegramdan kelmasa test_user ishlatiladi

const board = document.getElementById('board');
const statusText = document.getElementById('game-status');
const balanceText = document.getElementById('balance');
let selectedPiece = null;
let turn = 'black'; 
let gameState = Array(8).fill().map(() => Array(8).fill(null));

// Balansni real vaqtda Telegram ID orqali kuzatish
const balanceRef = ref(db, `users/${tgUserId}/balance`);
onValue(balanceRef, (snap) => {
    const val = snap.val() || 0;
    if (balanceText) balanceText.innerText = parseFloat(val).toFixed(5);
});

function initGame() {
    gameState = Array(8).fill().map(() => Array(8).fill(null));
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if ((r + c) % 2 !== 0) {
                if (r < 3) gameState[r][c] = { color: 'white', isKing: false }; 
                if (r > 4) gameState[r][c] = { color: 'black', isKing: false }; 
            }
        }
    }
    renderBoard();
}

function renderBoard() {
    board.innerHTML = '';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const cell = document.createElement('div');
            cell.className = `cell ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
            if (gameState[r][c]) {
                const piece = document.createElement('div');
                piece.className = `piece ${gameState[r][c].color} ${gameState[r][c].isKing ? 'king' : ''}`;
                if (selectedPiece && selectedPiece.r === r && selectedPiece.c === c) piece.classList.add('selected');
                piece.onclick = (e) => { e.stopPropagation(); if(turn === 'black') handlePieceClick(r, c); };
                cell.appendChild(piece);
            }
            cell.onclick = () => { if(turn === 'black') handleCellClick(r, c); };
            board.appendChild(cell);
        }
    }
}

function handlePieceClick(r, c) {
    if (gameState[r][c] && gameState[r][c].color === 'black') {
        selectedPiece = { r, c };
        renderBoard();
    }
}

function handleCellClick(r, c) {
    if (!selectedPiece) return;
    const piece = gameState[selectedPiece.r][selectedPiece.c];
    if (gameState[r][c] || (r + c) % 2 === 0) return;

    const rDiff = r - selectedPiece.r;
    const cDiff = Math.abs(c - selectedPiece.c);

    if (piece.isKing) {
        if (Math.abs(rDiff) === cDiff && isPathClear(selectedPiece.r, selectedPiece.c, r, c)) {
            executeMove(selectedPiece.r, selectedPiece.c, r, c);
        } else if (Math.abs(rDiff) === cDiff) {
            checkKingCapture(selectedPiece.r, selectedPiece.c, r, c);
        }
    } else {
        if (rDiff === -1 && cDiff === 1) executeMove(selectedPiece.r, selectedPiece.c, r, c);
        else if (Math.abs(rDiff) === 2 && cDiff === 2) {
            const midR = (r + selectedPiece.r) / 2;
            const midC = (c + selectedPiece.c) / 2;
            if (gameState[midR][midC] && gameState[midR][midC].color === 'white') {
                gameState[midR][midC] = null;
                executeMove(selectedPiece.r, selectedPiece.c, r, c);
            }
        }
    }
}

function isPathClear(fR, fC, tR, tC) {
    let rStep = tR > fR ? 1 : -1, cStep = tC > fC ? 1 : -1;
    let currR = fR + rStep, currC = fC + cStep;
    while (currR !== tR) {
        if (gameState[currR][currC]) return false;
        currR += rStep; currC += cStep;
    }
    return true;
}

function checkKingCapture(fR, fC, tR, tC) {
    let rStep = tR > fR ? 1 : -1, cStep = tC > fC ? 1 : -1;
    let currR = fR + rStep, currC = fC + cStep;
    let victim = null;
    while (currR !== tR) {
        if (gameState[currR][currC]) {
            if (victim || gameState[currR][currC].color === turn) return;
            victim = { r: currR, c: currC };
        }
        currR += rStep; currC += cStep;
    }
    if (victim) {
        gameState[victim.r][victim.c] = null;
        executeMove(fR, fC, tR, tC);
    }
}

function executeMove(fR, fC, tR, tC) {
    let p = gameState[fR][fC];
    if (turn === 'black' && tR === 0) p.isKing = true;
    if (turn === 'white' && tR === 7) p.isKing = true;
    gameState[tR][tC] = p;
    gameState[fR][fC] = null;
    selectedPiece = null;
    renderBoard();
    if (checkGameOver()) return;
    turn = turn === 'black' ? 'white' : 'black';
    statusText.innerText = turn === 'white' ? "AI o'ylamoqda..." : "Sizning navbatingiz (Qora)";
    if (turn === 'white') setTimeout(aiMove, 800);
}

// AI KUCHAYTIRILGAN
function aiMove() {
    let moves = [], captures = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = gameState[r][c];
            if (p?.color === 'white') {
                const dirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
                dirs.forEach(([dr, dc]) => {
                    if (p.isKing) {
                        for (let d = 1; d < 8; d++) {
                            let tr = r + dr * d, tc = c + dc * d;
                            if (tr < 0 || tr > 7 || tc < 0 || tc > 7) break;
                            if (!gameState[tr][tc]) moves.push({ f: { r, c }, t: { r: tr, c: tc }, score: 10 });
                            else if (gameState[tr][tc].color === 'black') {
                                let er = tr + dr, ec = tc + dc;
                                if (er >= 0 && er <= 7 && ec >= 0 && ec <= 7 && !gameState[er][ec]) {
                                    captures.push({ f: { r, c }, t: { r: er, c: ec }, v: { r: tr, c: tc }, score: 100 });
                                }
                                break;
                            } else break;
                        }
                    } else {
                        let tr = r + dr, tc = c + dc;
                        let er = r + dr * 2, ec = c + dc * 2;
                        if (er >= 0 && er <= 7 && ec >= 0 && ec <= 7 && gameState[tr][tc]?.color === 'black' && !gameState[er][ec]) {
                            captures.push({ f: { r, c }, t: { r: er, c: ec }, v: { r: tr, c: tc }, score: 100 });
                        }
                        if (dr > 0 && tr >= 0 && tr <= 7 && tc >= 0 && tc <= 7 && !gameState[tr][tc]) {
                            moves.push({ f: { r, c }, t: { r: tr, c: tc }, score: tr });
                        }
                    }
                });
            }
        }
    }
    let m = captures.length > 0 ? captures[0] : moves.sort((a,b)=>b.score-a.score)[0];
    if (m) {
        if (m.v) gameState[m.v.r][m.v.c] = null;
        executeMove(m.f.r, m.f.c, m.t.r, m.t.c);
    } else checkGameOver();
}

function checkGameOver() {
    let w = 0, b = 0;
    gameState.flat().forEach(p => { if (p?.color === 'white') w++; if (p?.color === 'black') b++; });
    if (w === 0) { endGame("G'alaba! 0.0003 USDT qo'shildi", 0.0003); return true; }
    if (b === 0) { endGame("AI yutdi!", 0); return true; }
    return false;
}

async function endGame(msg, prize) {
    alert(msg);
    if (prize > 0) {
        const userRef = ref(db, `users/${tgUserId}`);
        const snap = await get(userRef);
        let cur = snap.exists() ? (parseFloat(snap.val().balance) || 0) : 0;
        await update(userRef, { balance: Number((cur + prize).toFixed(5)) });
    }
    initGame();
}

initGame();
