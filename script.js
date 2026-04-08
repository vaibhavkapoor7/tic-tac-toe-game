const modes = ['easy', 'hard', 'pvp'];
let currentModeIndex = 1;

import { GoogleGenerativeAI } from "@google/generative-ai";

let board = ['', '', '', '', '', '', '', '', ''];
let gameActive = true;
let currentPlayer = 'X';
let scores = { X: 0, O: 0, Draw: 0 };
let geminiModel = null;

const winningConditions = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
];
const blocks = document.querySelectorAll('.block');
const statusDisplay = document.getElementById('status');
const modeBtn = document.getElementById('mode');
const playerX = document.getElementById('player1');
const playerO = document.getElementById('player2');
const scoreXDisplay = document.getElementById('scoreX');
const scoreODisplay = document.getElementById('scoreO');
const scoreDrawDisplay = document.getElementById('scoreDraw');
const apiKeyInput = document.getElementById('api-key');
const saveApiKeyBtn = document.getElementById('save-api-key');
const apiKeyStatus = document.getElementById('api-key-status');
const resetBtn = document.getElementById('reset-btn');

function setApiKey(apiKey) {
    const trimmedKey = apiKey.trim();

    if (!trimmedKey) {
        geminiModel = null;
        localStorage.removeItem('geminiApiKey');
        apiKeyStatus.innerText = 'Add your Gemini API key to enable hard mode.';
        return false;
    }

    const genAI = new GoogleGenerativeAI(trimmedKey);
    geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    localStorage.setItem('geminiApiKey', trimmedKey);
    apiKeyStatus.innerText = 'Gemini API key saved in this browser.';
    return true;
}

function hasGeminiKey() {
    return Boolean(geminiModel);
}

function loadSavedApiKey() {
    const savedApiKey = localStorage.getItem('geminiApiKey') || '';
    apiKeyInput.value = savedApiKey;

    if (savedApiKey) {
        setApiKey(savedApiKey);
    } else {
        apiKeyStatus.innerText = 'Add your Gemini API key to enable hard mode.';
    }
}

function getStatusMessage() {
    if (modes[currentModeIndex] === 'pvp') {
        return `Player ${currentPlayer} turn`;
    }

    if (modes[currentModeIndex] === 'hard' && !hasGeminiKey()) {
        return 'Enter your Gemini API key to play hard mode.';
    }

    return currentPlayer === 'X' ? 'Your turn' : 'COM is thinking...';
}

blocks.forEach(block => block.addEventListener('click', handleBlockClick));
modeBtn.addEventListener('click', togglemode);
document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
resetBtn.addEventListener('click', resetGame);
saveApiKeyBtn.addEventListener('click', () => {
    setApiKey(apiKeyInput.value);
    updateModesUI();
    resetGame();
});


function togglemode() {
    currentModeIndex = (currentModeIndex + 1) % modes.length;
    updateModesUI();
    resetGame();
    scores = { X: 0, O: 0, Draw: 0 };
    updateScores();
};
function resetGame() {
    board = ['', '', '', '', '', '', '', '', ''];
    gameActive = true;
    currentPlayer = 'X';
    statusDisplay.innerText = getStatusMessage();
    blocks.forEach(block => {
        block.innerText = '';
        block.className = 'block';
    });
};
function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    html.setAttribute('data-theme', isDark ? 'light' : 'dark');
    document.getElementById('theme-toggle').innerText = isDark ? '🌙' : '☀️';
};

function handleBlockClick(event) {
    const clickedBlock = event.target;
    const clickedIndex = parseInt(clickedBlock.getAttribute('data-index'));
    if (board[clickedIndex] !== '' || !gameActive)
        return;
    if (modes[currentModeIndex] !== 'pvp' && currentPlayer === 'O') return;
    processMove(clickedBlock, clickedIndex);
}

function processMove(block, index) {
    updateBlock(block, index, currentPlayer);
    if (checkResult()) return;

    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    const Mode = modes[currentModeIndex];

    if (Mode === 'pvp') {
        statusDisplay.innerText = `Player ${currentPlayer} turn`;
    }
    else {
        if (currentPlayer === 'O') {
            statusDisplay.innerText = `COM is thinking...`;
            if (Mode === 'hard') {
                if (hasGeminiKey()) {
                    setTimeout(() => makeGeminiMove(), 500);
                } else {
                    statusDisplay.innerText = 'Enter your Gemini API key for hard mode.';
                    currentPlayer = 'X';
                }
            } else {
                setTimeout(() => computerMoveEasy(), 500);
            }
        } else {
            statusDisplay.innerText = `Your turn`;
        }
    }
}
function updateBlock(block, index, player) {
    board[index] = player;
    block.innerText = player;
    block.classList.add(player.toLowerCase());
    block.classList.add('taken');
}
async function makeGeminiMove() {
    if (!gameActive) return;
    if (!hasGeminiKey()) {
        statusDisplay.innerText = 'Enter your Gemini API key for hard mode.';
        return;
    }

    // Create a description of the board state for Gemini
    let boardDescription = board.map((val, idx) => val === '' ? idx : val).join(',');

    const prompt = `
                You are playing Tic-Tac-Toe. You are 'O'.
                The board is a 1D array of 9 positions (0-8).
                Current board state: [${boardDescription}]
                (Numbers represent empty slots).
                
                Your goal is to win. If you cannot win immediately, block the opponent.
                
                CRITICAL: Return ONLY the number (0-8) of your move. Do not write any words.
            `;

    try {
        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        let moveText = response.text().trim();

        let moveIndex = parseInt(moveText.replace(/[^\d]/g, ''));
        if (isNaN(moveIndex) || board[moveIndex] !== '') {
            console.warn("AI attempted invalid move:", moveIndex, "Falling back to random.");
            computerMoveEasy();
        } else {
            const cell = document.querySelector(`.block[data-index='${moveIndex}']`);
            processMove(cell, moveIndex);
        }

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        statusDisplay.innerText = "API ERROR - TRYING RANDOM MOVE";
        setTimeout(computerMoveEasy, 1000);
    }
}
function computerMoveEasy() {
    if (!gameActive) return;
    const available = board.map((v, i) => v === '' ? i : null).filter(v => v !== null);

    if (available.length > 0) {
        const randomIndex = available[Math.floor(Math.random() * available.length)];
        const block = document.querySelector(`.block[data-index='${randomIndex}']`);
        processMove(block, randomIndex);
    }
}

function checkResult() {
    let roundWon = false;
    let winner = null;

    for (let i = 0; i < winningConditions.length; i++) {
        const [a, b, c] = winningConditions[i];
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            roundWon = true;
            winner = board[a];
            break;
        }
    }

    if (roundWon) {
        statusDisplay.innerText = winner === 'X' ? "Player X Wins!" : "Player O Wins!";
        gameActive = false;
        scores[winner]++;
        updateScores();
        return true;
    }

    if (!board.includes('')) {
        statusDisplay.innerText = "Draw!";
        gameActive = false;
        scores.Draw++;
        updateScores();
        return true;
    }

    return false;
}

function updateScores() {
    scoreXDisplay.innerText = scores.X;
    scoreODisplay.innerText = scores.O;
    scoreDrawDisplay.innerText = scores.Draw;
}

function updateModesUI() {
    const Mode = modes[currentModeIndex];
    if (Mode === 'hard') {
        modeBtn.innerText = hasGeminiKey() ? 'Mode: 1 Player (Hard)' : 'Mode: 1 Player (Hard - Add Key)';
        playerX.innerText = 'YOU -';
        playerO.innerText = 'COM -';
    }
    else if (Mode === 'easy') {
        modeBtn.innerText = 'Mode: 1 Player (Easy)';
        playerX.innerText = 'YOU -';
        playerO.innerText = 'COM -';
    }
    else {
        modeBtn.innerText = 'Mode: 2 Player (PvP)';
        playerX.innerText = 'PLAYER 1 -';
        playerO.innerText = 'PLAYER 2 -';
    }
}
loadSavedApiKey();
updateModesUI();
updateScores(); 