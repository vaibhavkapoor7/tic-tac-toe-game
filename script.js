const modes = ['easy', 'hard', 'pvp'];
let currentModeIndex = 1;

let board = ['', '', '', '', '', '', '', '', ''];
let gameActive = true;
let currentPlayer = 'X';
let scores = { X: 0, O: 0, Draw: 0 };

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
import { GoogleGenerativeAI } from "@google/generative-ai";
const API_KEY = "AIzaSyBuPudufoHKnAmAduBPacdOvruqke9d_IE";

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
const blocks = document.querySelectorAll('.block');
const statusDisplay = document.getElementById('status');
const modeBtn = document.getElementById('mode');
const playerX = document.getElementById('player1');
const playerO = document.getElementById('player2');
const scoreXDisplay = document.getElementById('scoreX');
const scoreODisplay = document.getElementById('scoreO');
const scoreDrawDisplay = document.getElementById('scoreDraw');

blocks.forEach(block=> block.addEventListener('click', handleBlockClick));
modeBtn.addEventListener('click', togglemode);
document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
document.querySelector('.btn:not(.btn-mode)').addEventListener('click', resetGame);


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
    statusDisplay.innerText = `Player ${currentPlayer} turn`;
    blocks.forEach(block => 
        {block.innerText = '';
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
    
    if (Mode === 'pvp'){
        statusDisplay.innerText = `Player ${currentPlayer} turn`;
    }
    else {
        if (currentPlayer === 'O') {
            statusDisplay.innerText = `COM is thinking...`;
            if (Mode === 'hard') {
                setTimeout(() => makeGeminiMove(), 500);
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
                const result = await model.generateContent(prompt);
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
        modeBtn.innerText = 'Mode: 1 Player (Hard)';  
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
 updateModesUI();
        updateScores(); 