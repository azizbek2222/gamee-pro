import { getUserBalance, updateBalanceInDB } from './firebase-config.js';

const grid = document.getElementById('grid');
const startBtn = document.getElementById('startBtn');
const cashoutBtn = document.getElementById('cashoutBtn');
const balanceEl = document.getElementById('balance');
const profitEl = document.getElementById('current-profit');

let mines = [];
let gameActive = false;
let currentProfit = 0;
const mineCount = 4; // Bombalar soni
const winPerStep = 0.00002;

// Kataklarni yaratish
function createBoard() {
    grid.innerHTML = '';
    for (let i = 0; i < 25; i++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.dataset.index = i;
        cell.addEventListener('click', () => handleCellClick(i));
        grid.appendChild(cell);
    }
}

async function init() {
    const bal = await getUserBalance();
    balanceEl.innerText = bal.toFixed(6);
    createBoard();
}

function startGame() {
    mines = [];
    currentProfit = 0;
    gameActive = true;
    profitEl.innerText = "0.000000";
    
    // Tasodifiy bombalar joylashuvi
    while(mines.length < mineCount) {
        let r = Math.floor(Math.random() * 25);
        if(!mines.includes(r)) mines.push(r);
    }

    createBoard();
    startBtn.disabled = true;
    cashoutBtn.disabled = false;
}

async function handleCellClick(index) {
    if (!gameActive) return;
    const cell = grid.children[index];
    if (cell.classList.contains('open')) return;

    if (mines.includes(index)) {
        // BOOM! Yutqazdi
        cell.classList.add('open', 'mine');
        cell.innerHTML = '💣';
        gameOver(false);
    } else {
        // Davom etadi
        cell.classList.add('open', 'gem');
        cell.innerHTML = '💎';
        currentProfit += winPerStep;
        profitEl.innerText = currentProfit.toFixed(6);
    }
}

async function gameOver(isWin) {
    gameActive = false;
    startBtn.disabled = false;
    cashoutBtn.disabled = true;

    // Barcha bombalarni ko'rsatish
    mines.forEach(m => {
        grid.children[m].innerHTML = '💣';
        grid.children[m].classList.add('open');
    });

    if (isWin && currentProfit > 0) {
        let bal = await getUserBalance();
        let newBal = (bal + currentProfit).toFixed(6);
        await updateBalanceInDB(newBal);
        balanceEl.innerText = newBal;
        alert(`G'alaba! +${currentProfit.toFixed(6)} USDT`);
    } else if (!isWin) {
        alert("Bomba portladi! Yutqazdingiz.");
    }
}

cashoutBtn.addEventListener('click', () => {
    if (currentProfit > 0) gameOver(true);
});

startBtn.addEventListener('click', startGame);

init();
