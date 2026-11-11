const boxes = document.querySelectorAll(".box");
const resetBtn = document.querySelector("#reset");
const newGameBtn = document.querySelector("#neew");
const clearScoresBtn = document.querySelector("#clear-scores");
const msgContainer = document.querySelector(".msg-Container");
const msg = document.querySelector("#msg");

// HUD, Mode & Sound Elements
const turnDisplay = document.querySelector("#turn-display");
const cardO = document.querySelector("#card-o");
const cardX = document.querySelector("#card-x");
const scoreOEl = document.querySelector("#score-o");
const scoreXEl = document.querySelector("#score-x");
const scoreDrawEl = document.querySelector("#score-draw");
const modePvpBtn = document.querySelector("#mode-pvp");
const modeAiBtn = document.querySelector("#mode-ai");
const labelX = document.querySelector("#label-x");
const soundToggleBtn = document.querySelector("#sound-toggle");
const soundIcon = document.querySelector("#sound-icon");
const soundLabel = document.querySelector("#sound-label");

let turnO = true; // true = Player O, false = Player X
let moveCount = 0;
let isGameOver = false;
let vsAI = false;
let isMuted = false;

let scores = { O: 0, X: 0, draw: 0 };

// ==========================================================================
// BATCOMPUTER WEB AUDIO SYNTHESIZER (With Mute Toggle)
// ==========================================================================
const AudioContextClass = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

const initAudio = () => {
    if (!audioCtx && AudioContextClass) {
        audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume();
    }
};

const playTone = (freqStart, freqEnd, duration, type = "sine", volume = 0.12, delay = 0) => {
    if (isMuted) return; // Cut audio if muted
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
    moveO: () => {
        playTone(620, 340, 0.09, "triangle", 0.14);
    },
    moveX: () => {
        playTone(260, 110, 0.11, "sawtooth", 0.11);
    },
    uiClick: () => {
        playTone(900, 450, 0.04, "sine", 0.08);
    },
    unmuteChirp: () => {
        playTone(520, 880, 0.08, "triangle", 0.12);
    },
    win: () => {
        const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
        notes.forEach((freq, idx) => {
            playTone(freq, freq, 0.22, "triangle", 0.15, idx * 0.09);
        });
    },
    draw: () => {
        playTone(220, 180, 0.18, "sawtooth", 0.12, 0);
        playTone(170, 120, 0.28, "sawtooth", 0.12, 0.2);
    }
};

// Sound Mute / Unmute Listener
if (soundToggleBtn) {
    soundToggleBtn.addEventListener("click", () => {
        isMuted = !isMuted;

        if (isMuted) {
            soundToggleBtn.classList.add("muted");
            soundIcon.className = "fas fa-volume-mute";
            soundLabel.innerText = "SFX: MUTED";
        } else {
            soundToggleBtn.classList.remove("muted");
            soundIcon.className = "fas fa-volume-up";
            soundLabel.innerText = "SFX: ON";
            sfx.unmuteChirp();
        }
    });
}

// ==========================================================================
// GAME LOGIC & HUD UPDATES
// ==========================================================================
const winPatterns = [
    [0, 1, 2],
    [0, 3, 6],
    [3, 4, 5],
    [6, 7, 8],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
];

const updateTurnHUD = () => {
    const currentSymbol = turnO ? "O" : "X";
    boxes.forEach((box) => {
        if (box.innerText === "") {
            box.setAttribute("data-hover", currentSymbol);
        } else {
            box.removeAttribute("data-hover");
        }
    });

    if (turnO) {
        turnDisplay.innerText = "O's MOVE";
        turnDisplay.style.borderColor = "var(--amber)";
        turnDisplay.style.color = "var(--amber)";
        turnDisplay.style.background = "rgba(255, 153, 0, 0.12)";
        cardO.classList.add("active-turn");
        cardX.classList.remove("active-turn");
    } else {
        turnDisplay.innerText = vsAI ? "AI THINKING..." : "X's MOVE";
        turnDisplay.style.borderColor = "var(--crimson)";
        turnDisplay.style.color = "var(--crimson)";
        turnDisplay.style.background = "rgba(255, 10, 22, 0.12)";
        cardX.classList.add("active-turn");
        cardO.classList.remove("active-turn");
    }
};

const resetGame = () => {
    turnO = true;
    moveCount = 0;
    isGameOver = false;
    enableBoxes();
    msg.innerText = "";
    msgContainer.classList.add("hide");
    updateTurnHUD();
};

boxes.forEach((box) => {
    box.addEventListener("click", () => {
        if (box.innerText !== "" || isGameOver) return;
        if (vsAI && !turnO) return;

        makeMove(box);

        if (vsAI && !isGameOver && !turnO) {
            setTimeout(makeAIMove, 420);
        }
    });
});

const makeMove = (box) => {
    if (turnO) {
        box.innerText = "O";
        box.classList.add("mark-o");
        sfx.moveO();
        turnO = false;
    } else {
        box.innerText = "X";
        box.classList.add("mark-x");
        sfx.moveX();
        turnO = true;
    }
    box.disabled = true;
    moveCount++;

    checkWinner();
    if (!isGameOver) {
        updateTurnHUD();
    }
};

// Smart Tactical AI
const makeAIMove = () => {
    if (isGameOver) return;

    let chosenIndex = findBestMove("X");
    if (chosenIndex === null) {
        chosenIndex = findBestMove("O");
    }
    if (chosenIndex === null && boxes[4].innerText === "") {
        chosenIndex = 4;
    }
    if (chosenIndex === null) {
        const emptyIndices = [];
        boxes.forEach((b, idx) => {
            if (b.innerText === "") emptyIndices.push(idx);
        });
        if (emptyIndices.length > 0) {
            chosenIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
        }
    }

    if (chosenIndex !== null) {
        makeMove(boxes[chosenIndex]);
    }
};

const findBestMove = (symbol) => {
    for (let pattern of winPatterns) {
        const [a, b, c] = pattern;
        const vals = [boxes[a].innerText, boxes[b].innerText, boxes[c].innerText];
        const symbolCount = vals.filter((v) => v === symbol).length;
        const emptyCount = vals.filter((v) => v === "").length;

        if (symbolCount === 2 && emptyCount === 1) {
            if (boxes[a].innerText === "") return a;
            if (boxes[b].innerText === "") return b;
            if (boxes[c].innerText === "") return c;
        }
    }
    return null;
};

const disableBoxes = () => {
    for (let box of boxes) {
        box.disabled = true;
    }
};

const enableBoxes = () => {
    for (let box of boxes) {
        box.disabled = false;
        box.innerText = "";
        box.classList.remove("mark-o", "mark-x", "win-box");
    }
};

const showWinner = (winner, winningPattern) => {
    isGameOver = true;
    disableBoxes();

    winningPattern.forEach((idx) => {
        boxes[idx].classList.add("win-box");
    });

    sfx.win();

    if (winner === "O") {
        scores.O++;
        scoreOEl.innerText = scores.O;
    } else {
        scores.X++;
        scoreXEl.innerText = scores.X;
    }

    const winnerName = (vsAI && winner === "X") ? "BATCOMPUTER AI" : `OPERATIVE ${winner}`;
    msg.innerText = `VICTORY // ${winnerName}`;

    setTimeout(() => {
        msgContainer.classList.remove("hide");
    }, 650);
};

const showDraw = () => {
    isGameOver = true;
    scores.draw++;
    scoreDrawEl.innerText = scores.draw;

    sfx.draw();

    msg.innerText = "STALEMATE // NO WINNER";
    setTimeout(() => {
        msgContainer.classList.remove("hide");
    }, 450);
};

const checkWinner = () => {
    for (let pattern of winPatterns) {
        let pos1val = boxes[pattern[0]].innerText;
        let pos2val = boxes[pattern[1]].innerText;
        let pos3val = boxes[pattern[2]].innerText;

        if (pos1val !== "" && pos2val !== "" && pos3val !== "") {
            if (pos1val === pos2val && pos2val === pos3val) {
                showWinner(pos1val, pattern);
                return;
            }
        }
    }

    if (moveCount === 9 && !isGameOver) {
        showDraw();
    }
};

modePvpBtn.addEventListener("click", () => {
    sfx.uiClick();
    vsAI = false;
    modePvpBtn.classList.add("active");
    modeAiBtn.classList.remove("active");
    labelX.innerText = "OPERATIVE X";
    resetGame();
});

modeAiBtn.addEventListener("click", () => {
    sfx.uiClick();
    vsAI = true;
    modeAiBtn.classList.add("active");
    modePvpBtn.classList.remove("active");
    labelX.innerText = "BAT-AI (X)";
    resetGame();
});

clearScoresBtn.addEventListener("click", () => {
    sfx.uiClick();
    scores = { O: 0, X: 0, draw: 0 };
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

updateTurnHUD();
