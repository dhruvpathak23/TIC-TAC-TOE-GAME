🎯 TIC-TAC-TOE // Minimax AI & FIFO Queue Tactical Simulator

[![Live Demo](https://img.shields.io/badge/PLAY_LIVE-GITHUB_PAGES-ff0a16?style=for-the-badge&logo=github)](https://dhruvpathak23.github.io/TIC-TAC-TOE-GAME/)
[![Algorithm](https://img.shields.io/badge/AI_ENGINE-MINIMAX_BACKTRACKING-ff9900?style=for-the-badge)](https://dhruvpathak23.github.io/TIC-TAC-TOE-GAME/)
[![Data Structures](https://img.shields.io/badge/DSA-FIFO_QUEUE_%7C_LIFO_STACK-00ff88?style=for-the-badge)](https://dhruvpathak23.github.io/TIC-TAC-TOE-GAME/)

A tactical **Tic-Tac-Toe** simulator themed around *The Batman (2022)* Batcomputer OS. Far beyond a standard beginner grid, this project implements **Recursive Minimax Game Theory**, a **FIFO Queue "Infinite / Vanishing Marks" mode** that eliminates draws, a **LIFO Move History Stack** for time-rewind undos, and a **Web Audio API sound synthesizer**.

🔗 **Live Deployment:** [https://dhruvpathak23.github.io/TIC-TAC-TOE-GAME/](https://dhruvpathak23.github.io/TIC-TAC-TOE-GAME/)

---

## 🧠 Core Data Structures & Algorithms Implemented

### 1. Unbeatable Minimax Decision Tree (`hard` mode)
* Uses recursive backtracking (`minimax(board, depth, isMaximizing)`) to simulate all possible future game states to terminal nodes (`+10 - depth` for AI win, `-10 + depth` for human win, `0` for stalemate).
* Powers a **Live Win-Probability Evaluation Bar** (similar to a chess engine bar) that recalculates mathematical board advantage after every move.

### 2. Infinite / Vanishing Mode via FIFO Queue (`queueO`, `queueX`)
* Solves the classic Tic-Tac-Toe stalemate problem by restricting each player to **3 active marks** on the board at any time.
* Managed via First-In-First-Out (FIFO) queues: when a player places their 4th mark, `queue.shift()` automatically erases their oldest mark from the board.
* Highlights the oldest piece with a pulsing `VANISHING NEXT` warning before it disappears.

### 3. Time-Rewind Undo via LIFO Stack (`historyStack`)
* Every move pushes a deep state snapshot (`board`, `turnO`, `queueO`, `queueX`) onto a Last-In-First-Out (LIFO) stack.
* Clicking **Rewind `[U]`** pops the stack and restores the exact prior board and queue configuration.

---

## ✨ Interactive Features

* **3 AI Difficulty Tiers:** Switch between **Scout** (Random RNG), **Tactical** (1-step win/block heuristic), and **Minimax** (Unbeatable recursive solver) — plus **2-Player Local Versus**.
* **Blitz 5-Second Shot Clock:** Optional high-pressure timer bar that forces an automatic panic move if a player hesitates.
* **Animated SVG Laser Strike-Through:** Dynamically calculates vector coordinates across winning rows, columns, or diagonals and fires a glowing neon laser beam on victory.
* **Synthesized Web Audio SFX:** Zero-dependency oscillator sound effects for `O` moves, `X` moves, vanishing pieces, rewinds, and victory chords with a persistent `SFX: ON / MUTED` toggle.
* **Full Keyboard Control & Persistence:** Use keys **`[1]–[9]`** to deploy marks, **`[U]`** to rewind, and **`[R]`** to rematch. Scores and audio preferences persist in `localStorage`.

---

## 📂 File Structure

```text
├── index.html      # Tactical HUD layout, evaluation bar, 3x3 grid & SVG laser overlay
├── tictactoe.css   # Noir crimson/amber styling, dying-piece animations & responsive grid
└── tictactoe.js    # Minimax algorithm, FIFO queue logic, LIFO undo stack & Web Audio synth
🚀 Run Locally
Bash
git clone [https://github.com/dhruvpathak23/TIC-TAC-TOE-GAME.git](https://github.com/dhruvpathak23/TIC-TAC-TOE-GAME.git)
cd TIC-TAC-TOE-GAME
# Open index.html in your browser
👤 Author
Dhruv Pathak — GitHub | LinkedIn | LeetCode
