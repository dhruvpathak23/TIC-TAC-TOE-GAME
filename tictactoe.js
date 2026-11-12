const boxes = document.querySelectorAll(".box");
const resetBtn = document.querySelector("#reset");
const newGameBtn = document.querySelector("#neew");
const clearScoresBtn = document.querySelector("#clear-scores");
const undoBtn = document.querySelector("#undo-btn");
const msgContainer = document.querySelector(".msg-Container");
const msg = document.querySelector("#msg");

// HUD, Mode & Config Elements
const turnDisplay = document.querySelector("#turn-display");
const ruleReadout = document.querySelector("#rule-readout");
const cardO = document.querySelector("#card-o");
const cardX = document.querySelector("#card-x");
const scoreOEl = document.querySelector("#score-o");
const scoreXEl = document.querySelector("#score-x");
const scoreDrawEl = document.querySelector("#score-draw");
const labelX = document.querySelector("#label-x");

const modePvpBtn = document.querySelector("#mode-pvp");
const modeAiBtn = document.querySelector("#mode-ai");
const aiDiffGroup = document.querySelector("#ai-diff-group");
const diffBtns = document.querySelectorAll(".diff-btn");
const ruleClassicBtn = document.querySelector("#rule-classic");
const ruleInfiniteBtn = document.querySelector("#rule-infinite");
const toggleBlitzBtn = document.querySelector("#toggle-blitz");

// Evaluation Bar, Blitz Bar & Laser SVG
const evalFillO = document.querySelector("#eval-fill-o");
const evalText = document.querySelector("#eval-text");
const blitzWrapper = document.querySelector("#blitz-wrapper");
const blitzFill = document.querySelector("#blitz-fill");
const laserLine = document.querySelector("#laser-line");

// Sound Elements
const soundToggleBtn = document.querySelector("#sound-toggle");
const soundIcon = document.querySelector("#sound-icon");
const soundLabel = document.querySelector("#sound-label");

// ==========================================================================
// STATE & DATA STRUCTURES (FIFO Queues + LIFO History Stack + localStorage)
// ==========================================================================
let boardState = Array(9).fill("");
let turnO = true; // true = Player O, false = Player X (or AI)
let isGameOver = false;
let vsAI = true; // Default to vs Bat-AI so visitors immediately experience Minimax
let aiDifficulty = "hard"; // 'easy' | 'medium' | 'hard' (Minimax)
let infiniteMode = false; // FIFO Queue mode (max 3 marks per player)
let blitzMode = false;

// FIFO Queues for Infinite (Vanishing Marks) Mode
let queueO = [];
let queueX = [];

// LIFO Stack for Rewind / Undo Move
let historyStack = [];

// Blitz Shot-Clock Timer
let blitzInterval = null;
let blitzTimeLeft = 100;

// Load persisted scores & mute state from localStorage
let scores = JSON.parse(localStorage.getItem("bat_ttt_scores")) || { O: 0, X: 0, draw: 0 };
let isMuted = JSON.parse(localStorage.getItem("bat_ttt_muted")) || false;

scoreOEl.innerText = scores.O;
scoreXEl.innerText = scores.X;
scoreDrawEl.innerText = scores.draw;

const saveScores = () => {
    localStorage.setItem("bat_ttt_scores", JSON.stringify(scores));
};

// ==========================================================================
// BATCOMPUTER WEB AUDIO SYNTHESIZER
// ==========================================================================
const AudioContextClass = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

const initAudio = () => {
    if (!audioCtx && AudioContextClass) audioCtx = new AudioContextClass();
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
};

const playTone = (freqStart, freqEnd, duration, type = "sine", volume = 0.11, delay = 0) => {
    if (isMuted) return;
    initAudio();
    if (!audioCtx) return;

    const startTime = audioCtx.currentTime + delay;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, startTime);
    if (freqEnd !== freqStart) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 20), startTime + duration);
    }

    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration);
};

const sfx = {
    moveO: () => playTone(620, 340, 0.09, "triangle", 0.13),
    moveX: () => playTone(260, 110, 0.11, "sawtooth", 0.11),
    vanish: () => playTone(480, 140, 0.14, "sine", 0.1),
    undo: () => playTone(300, 580, 0.09, "triangle", 0.11),
    uiClick: () => playTone(900, 450, 0.04, "sine", 0.08),
    win: () => {
        [440, 554.37, 659.25, 880].forEach((freq, idx) => {
            playTone(freq, freq, 0.22, "triangle", 0.14, idx * 0.08);
        });
    },
    draw: () => {
        playTone(220, 180, 0.18, "sawtooth", 0.11, 0);
        playTone(170, 120, 0.28, "sawtooth", 0.11, 0.2);
    }
};

const applyMuteUI = () => {
    if (isMuted) {
        soundToggleBtn.classList.add("muted");
        soundIcon.className = "fas fa-volume-mute";
        soundLabel.innerText = "SFX: MUTED";
    } else {
        soundToggleBtn.classList.remove("muted");
        soundIcon.className = "fas fa-volume-up";
        soundLabel.innerText = "SFX: ON";
    }
};
applyMuteUI();

soundToggleBtn.addEventListener("click", () => {
    isMuted = !isMuted;
    localStorage.setItem("bat_ttt_muted", JSON.stringify(isMuted));
    applyMuteUI();
    if (!isMuted) sfx.uiClick();
});

// ==========================================================================
// WIN PATTERNS & SVG LASER COORDINATES
// ==========================================================================
const winPatterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
    [0, 4, 8], [2, 4, 6]             // Diagonals
];

// Coordinates inside the 300x300 SVG viewBox for each winning pattern
const laserCoords = {
    "0,1,2": { x1: 25, y1: 55, x2: 275, y2: 55 },
    "3,4,5": { x1: 25, y1: 150, x2: 275, y2: 150 },
    "6,7,8": { x1: 25, y1: 245, x2: 275, y2: 245 },
    "0,3,6": { x1: 55, y1: 25, x2: 55, y2: 275 },
    "1,4,7": { x1: 150, y1: 25, x2: 150, y2: 275 },
    "2,5,8": { x1: 245, y1: 25, x2: 245, y2: 275 },
    "0,4,8": { x1: 30, y1: 30, x2: 270, y2: 270 },
    "2,4,6": { x1: 270, y1: 30, x2: 30, y2: 270 }
};

// ==========================================================================
// RENDER BOARD & HUD TELEMETRY
// ==========================================================================
const renderBoard = () => {
    const currentSymbol = turnO ? "O" : "X";

    boxes.forEach((box, idx) => {
        const markSpan = box.querySelector(".mark");
        const val = boardState[idx];
        markSpan.innerText = val;

        box.classList.remove("mark-o", "mark-x", "dying-piece");
        if (val === "O") box.classList.add("mark-o");
        if (val === "X") box.classList.add("mark-x");

        box.disabled = val !== "" || isGameOver;

        if (val === "" && !isGameOver) {
            box.setAttribute("data-hover", currentSymbol);
        } else {
            box.removeAttribute("data-hover");
        }
    });

    // In Infinite (FIFO) Mode, highlight the piece that will vanish on the active player's move
    if (infiniteMode && !isGameOver) {
        if (turnO && queueO.length === 3) {
            boxes[queueO[0]].classList.add("dying-piece");
        } else if (!turnO && queueX.length === 3) {
            boxes[queueX[0]].classList.add("dying-piece");
        }
    }

    undoBtn.disabled = historyStack.length === 0 || isGameOver;
};

const updateTurnHUD = () => {
    const modeText = infiniteMode ? "FIFO QUEUE (MAX 3)" : (vsAI ? `AI: ${aiDifficulty.toUpperCase()}` : "2P VERSUS");
    ruleReadout.innerText = modeText;

    if (turnO) {
        turnDisplay.innerText = "O's MOVE";
        turnDisplay.style.borderColor = "var(--amber)";
        turnDisplay.style.color = "var(--amber)";
        turnDisplay.style.background = "rgba(255, 153, 0, 0.12)";
        cardO.classList.add("active-turn");
        cardX.classList.remove("active-turn");
    } else {
        turnDisplay.innerText = vsAI ? "AI COMPUTING..." : "X's MOVE";
        turnDisplay.style.borderColor = "var(--crimson)";
        turnDisplay.style.color = "var(--crimson)";
        turnDisplay.style.background = "rgba(255, 10, 22, 0.12)";
        cardX.classList.add("active-turn");
        cardO.classList.remove("active-turn");
    }

    updateEvaluationBar();
};

// ==========================================================================
// MINIMAX BACKTRACKING ALGORITHM & LIVE EVALUATION BAR
// ==========================================================================
const evaluateState = (bd) => {
    for (let pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (bd[a] && bd[a] === bd[b] && bd[a] === bd[c]) {
            return bd[a] === "X" ? 10 : -10;
        }
    }
    return 0;
};

const minimax = (bd, depth, isMaximizing) => {
    const score = evaluateState(bd);
    if (score === 10) return score - depth;
    if (score === -10) return score + depth;
    if (!bd.includes("")) return 0;

    if (isMaximizing) {
        let best = -Infinity;
        for (let i = 0; i < 9; i++) {
            if (bd[i] === "") {
                bd[i] = "X";
                best = Math.max(best, minimax(bd, depth + 1, false));
                bd[i] = "";
            }
        }
        return best;
    } else {
        let best = Infinity;
        for (let i = 0; i < 9; i++) {
            if (bd[i] === "") {
                bd[i] = "O";
                best = Math.min(best, minimax(bd, depth + 1, true));
                bd[i] = "";
            }
        }
        return best;
    }
};

const updateEvaluationBar = () => {
    if (isGameOver) return;
    // Quick heuristic evaluation for the live bar
    const copy = [...boardState];
    const emptyCount = copy.filter(v => v === "").length;
    if (emptyCount === 9) {
        evalFillO.style.width = "50%";
        evalText.innerText = "EVEN (0.0)";
        return;
    }

    // Use Minimax when <= 7 empty cells for instant zero-lag calculation
    let score = 0;
    if (!infiniteMode && emptyCount <= 7) {
        score = minimax(copy, 0, !turnO);
    } else {
        score = evaluateState(copy);
    }

    // Convert score (-10 to +10) into O's percentage (0% to 100%)
    const oPercent = Math.min(95, Math.max(5, 50 - score * 4.5));
    evalFillO.style.width = `${oPercent}%`;

    if (score > 0) {
        evalText.innerText = `X ADV (+${score})`;
    } else if (score < 0) {
        evalText.innerText = `O ADV (+${Math.abs(score)})`;
    } else {
        evalText.innerText = "LOCKED (0.0)";
    }
};

// ==========================================================================
// BLITZ 5-SECOND SHOT CLOCK TIMER
// ==========================================================================
const startBlitzTimer = () => {
    clearInterval(blitzInterval);
    if (!blitzMode || isGameOver) return;

    blitzTimeLeft = 100;
    blitzFill.style.width = "100%";

    blitzInterval = setInterval(() => {
        if (isGameOver || (vsAI && !turnO)) return;
        blitzTimeLeft -= 2;
        blitzFill.style.width = `${Math.max(0, blitzTimeLeft)}%`;

        if (blitzTimeLeft <= 0) {
            clearInterval(blitzInterval);
            // Panic auto-move on timeout
            const emptyIndices = boardState.map((v, i) => v === "" ? i : null).filter(i => i !== null);
            if (emptyIndices.length > 0) {
                const randIdx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
                executeMove(randIdx);
                if (vsAI && !isGameOver && !turnO) {
                    setTimeout(makeAIMove, 380);
                }
            }
        }
    }, 100);
};

// ==========================================================================
// CORE GAMEPLAY & FIFO QUEUE MECHANICS
// ==========================================================================
const executeMove = (index) => {
    if (boardState[index] !== "" || isGameOver) return;

    // Save snapshot onto LIFO History Stack before mutating
    historyStack.push({
        board: [...boardState],
        turnO: turnO,
        queueO: [...queueO],
        queueX: [...queueX]
    });

    if (turnO) {
        // FIFO Queue check in Infinite Mode
        if (infiniteMode && queueO.length === 3) {
            const oldestIdx = queueO.shift();
            boardState[oldestIdx] = "";
            sfx.vanish();
        }
        boardState[index] = "O";
        queueO.push(index);
        sfx.moveO();
        turnO = false;
    } else {
        if (infiniteMode && queueX.length === 3) {
            const oldestIdx = queueX.shift();
            boardState[oldestIdx] = "";
            sfx.vanish();
        }
        boardState[index] = "X";
        queueX.push(index);
        sfx.moveX();
        turnO = true;
    }

    renderBoard();
    checkWinner();

    if (!isGameOver) {
        updateTurnHUD();
        startBlitzTimer();
    }
};

// Box Click Listeners
boxes.forEach((box, idx) => {
    box.addEventListener("click", () => {
        if (boardState[idx] !== "" || isGameOver) return;
        if (vsAI && !turnO) return;

        executeMove(idx);

        if (vsAI && !isGameOver && !turnO) {
            setTimeout(makeAIMove, 380);
        }
    });
});

// ==========================================================================
// AI DECISION ENGINE (SCOUT / TACTICAL / UNBEATABLE MINIMAX)
// ==========================================================================
const makeAIMove = () => {
    if (isGameOver) return;

    const emptyIndices = boardState.map((v, i) => v === "" ? i : null).filter(i => i !== null);
    if (emptyIndices.length === 0) return;

    let chosenIndex = null;

    if (aiDifficulty === "easy") {
        // Scout: Random valid tile
        chosenIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    } else if (aiDifficulty === "medium" || infiniteMode) {
        // Tactical: 1-step win -> 1-step block -> center -> random
        chosenIndex = findImmediateMove("X") ?? findImmediateMove("O");
        if (chosenIndex === null && boardState[4] === "") chosenIndex = 4;
        if (chosenIndex === null) {
            chosenIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
        }
    } else {
        // Vengeance (Unbeatable Recursive Minimax)
        let bestScore = -Infinity;
        for (let i of emptyIndices) {
            boardState[i] = "X";
            let score = minimax(boardState, 0, false);
            boardState[i] = "";
            if (score > bestScore) {
                bestScore = score;
                chosenIndex = i;
            }
        }
    }

    if (chosenIndex !== null) {
        executeMove(chosenIndex);
    }
};

const findImmediateMove = (symbol) => {
    for (let pattern of winPatterns) {
        const [a, b, c] = pattern;
        const vals = [boardState[a], boardState[b], boardState[c]];
        if (vals.filter(v => v === symbol).length === 2 && vals.filter(v => v === "").length === 1) {
            if (boardState[a] === "") return a;
            if (boardState[b] === "") return b;
            if (boardState[c] === "") return c;
        }
    }
    return null;
};

// ==========================================================================
// WIN / DRAW DETECTION & SVG LASER STRIKE-THROUGH
// ==========================================================================
const fireLaser = (pattern) => {
    const key = pattern.join(",");
    const coords = laserCoords[key];
    if (!coords) return;

    laserLine.setAttribute("x1", coords.x1);
    laserLine.setAttribute("y1", coords.y1);
    laserLine.setAttribute("x2", coords.x2);
    laserLine.setAttribute("y2", coords.y2);
    laserLine.classList.add("active-laser");
};

const showWinner = (winner, pattern) => {
    isGameOver = true;
    clearInterval(blitzInterval);

    pattern.forEach(idx => boxes[idx].classList.add("win-box"));
    fireLaser(pattern);
    sfx.win();

    if (winner === "O") {
        scores.O++;
        scoreOEl.innerText = scores.O;
        evalFillO.style.width = "100%";
        evalText.innerText = "O VICTORY";
    } else {
        scores.X++;
        scoreXEl.innerText = scores.X;
        evalFillO.style.width = "0%";
        evalText.innerText = "X VICTORY";
    }
    saveScores();

    const winnerName = (vsAI && winner === "X") ? "BATCOMPUTER AI" : `OPERATIVE ${winner}`;
    msg.innerText = `VICTORY // ${winnerName}`;

    setTimeout(() => {
        msgContainer.classList.remove("hide");
    }, 850);
};

const showDraw = () => {
    isGameOver = true;
    clearInterval(blitzInterval);
    scores.draw++;
    scoreDrawEl.innerText = scores.draw;
    saveScores();

    evalFillO.style.width = "50%";
    evalText.innerText = "STALEMATE";
    sfx.draw();

    msg.innerText = "STALEMATE // NO WINNER";
    setTimeout(() => {
        msgContainer.classList.remove("hide");
    }, 500);
};

const checkWinner = () => {
    for (let pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (boardState[a] && boardState[a] === boardState[b] && boardState[a] === boardState[c]) {
            showWinner(boardState[a], pattern);
            return;
        }
    }

    if (!boardState.includes("") && !isGameOver) {
        showDraw();
    }
};

// ==========================================================================
// LIFO STACK UNDO (REWIND MOVE) & BOARD RESET
// ==========================================================================
const undoLastMove = () => {
    if (historyStack.length === 0 || isGameOver) return;
    sfx.undo();

    // In vs-AI mode, pop both AI's move and Player's move so it returns to Player O's turn
    let snapshot = historyStack.pop();
    if (vsAI && !snapshot.turnO && historyStack.length > 0) {
        snapshot = historyStack.pop();
    }

    boardState = [...snapshot.board];
    turnO = snapshot.turnO;
    queueO = [...snapshot.queueO];
    queueX = [...snapshot.queueX];

    renderBoard();
    updateTurnHUD();
    startBlitzTimer();
};

const resetGame = () => {
    clearInterval(blitzInterval);
    boardState = Array(9).fill("");
    queueO = [];
    queueX = [];
    historyStack = [];
    turnO = true;
    isGameOver = false;

    boxes.forEach(box => box.classList.remove("win-box", "dying-piece"));
    laserLine.classList.remove("active-laser");
    msgContainer.classList.add("hide");

    renderBoard();
    updateTurnHUD();
    startBlitzTimer();
};

// ==========================================================================
// UI CONTROLS & KEYBOARD HOTKEYS ([1]-[9], [U], [R])
// ==========================================================================
modeAiBtn.addEventListener("click", () => {
    sfx.uiClick();
    vsAI = true;
    modeAiBtn.classList.add("active");
    modePvpBtn.classList.remove("active");
    aiDiffGroup.classList.remove("hide");
    labelX.innerText = "BAT-AI (X)";
    resetGame();
});

modePvpBtn.addEventListener("click", () => {
    sfx.uiClick();
    vsAI = false;
    modePvpBtn.classList.add("active");
    modeAiBtn.classList.remove("active");
    aiDiffGroup.classList.add("hide");
    labelX.innerText = "OPERATIVE X";
    resetGame();
});

diffBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        sfx.uiClick();
        diffBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        aiDifficulty = btn.getAttribute("data-diff");
        resetGame();
    });
});

ruleClassicBtn.addEventListener("click", () => {
    sfx.uiClick();
    infiniteMode = false;
    ruleClassicBtn.classList.add("active");
    ruleInfiniteBtn.classList.remove("active");
    resetGame();
});

ruleInfiniteBtn.addEventListener("click", () => {
    sfx.uiClick();
    infiniteMode = true;
    ruleInfiniteBtn.classList.add("active");
    ruleClassicBtn.classList.remove("active");
    resetGame();
});

toggleBlitzBtn.addEventListener("click", () => {
    sfx.uiClick();
    blitzMode = !blitzMode;
    toggleBlitzBtn.classList.toggle("active", blitzMode);
    toggleBlitzBtn.innerHTML = `<i class="fas fa-bolt"></i> BLITZ: ${blitzMode ? "ON" : "OFF"}`;
    blitzWrapper.classList.toggle("hide", !blitzMode);
    resetGame();
});

undoBtn.addEventListener("click", undoLastMove);

clearScoresBtn.addEventListener("click", () => {
    sfx.uiClick();
    scores = { O: 0, X: 0, draw: 0 };
    saveScores();
    scoreOEl.innerText = "0";
    scoreXEl.innerText = "0";
    scoreDrawEl.innerText = "0";
    resetGame();
});

newGameBtn.addEventListener("click", () => {
    sfx.uiClick();
    resetGame();
});

resetBtn.addEventListener("click", () => {
    sfx.uiClick();
    resetGame();
});

// Keyboard Hotkeys: [1]-[9] for Grid, [U] for Rewind, [R] for Rematch
window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if (key >= "1" && key <= "9") {
        const idx = parseInt(key, 10) - 1;
        boxes[idx].click();
    } else if (key === "u") {
        undoLastMove();
    } else if (key === "r") {
        sfx.uiClick();
        resetGame();
    }
});

// Initialize on load
renderBoard();
updateTurnHUD();
