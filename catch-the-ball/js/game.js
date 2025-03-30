const API_URL = 'http://localhost:5000/api/captcha';
let captchaToken = null;
let animationId = null;
let gameStartTime = null;
let ball = document.getElementById('player-ball');
let messageElement = document.getElementById('status');
let playAgainButton = document.querySelector('.button');
let isGameActive = false;

async function initializeCaptcha() {
    try {
        const response = await fetch(`${API_URL}/init`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ domain: window.location.origin })
        });
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to initialize CAPTCHA');
        }

        captchaToken = data.token;
        return data;
    } catch (error) {
        messageElement.textContent = `Error: ${error.message}`;
        messageElement.style.color = '#ff4444';
        return null;
    }
}

async function updateBallPosition() {
    if (!isGameActive || !captchaToken) return;

    try {
        const response = await fetch(`${API_URL}/position`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token: captchaToken })
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to get position');
        }

        ball.style.left = `${data.x}px`;
        ball.style.top = `${data.y}px`;
        
        animationId = requestAnimationFrame(updateBallPosition);
    } catch (error) {
        console.error('Error updating position:', error);
        stopGame();
    }
}

async function verifyCaptcha(patternIndex) {
    try {
        const response = await fetch(`${API_URL}/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: captchaToken,
                pattern_index: patternIndex
            })
        });
        const data = await response.json();
        
        if (data.success) {
            messageElement.textContent = 'Success! You passed the CAPTCHA!';
            messageElement.style.color = '#4CAF50';
            playAgainButton.style.display = 'block';
        } else {
            messageElement.textContent = 'Incorrect pattern. Try again!';
            messageElement.style.color = '#ff4444';
            resetGame();
        }
    } catch (error) {
        messageElement.textContent = `Error: ${error.message}`;
        messageElement.style.color = '#ff4444';
    }
    stopGame();
}

function stopGame() {
    isGameActive = false;
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}

// async function startGame() {
//     const initialized = await initializeCaptcha();
//     const blockchain = new Blockchain();
//     blockchain.loadChain(); // Load existing chain first
//     blockchain.addScore(5); // Add new score
//     await blockchain.minePendingScores(); // Mine the pending scores
    
//     if (!initialized) {
//         alert('Failed to initialize verification. Please try again.');
//         return;
//     }

//     document.getElementById('start-screen').style.display = 'none';
//     document.getElementById('game-screen').style.display = 'block';
//     gameStarted = true;
//     gameStatus = null;
//     time = 0;
//     patternIndex = 0;
//     startAnimation();

//     // Check total score after mining
//     const totalScore = blockchain.getTotalScore();
//     console.log('Current total score:', totalScore);
//     if (totalScore >= 50) {
//         endGame('won');
//     }
// }

// function resetGame() {
//     stopGame();
//     startGame();
// }

function handleMouseMove(event) {
    if (!isGameActive) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    ball.style.left = `${event.clientX - rect.left - 12}px`;
    ball.style.top = `${event.clientY - rect.top - 12}px`;
}

function handleMouseLeave() {
    if (!isGameActive) {
        resetGame();
    }
}

// Update the click event handler
function handleClick(event) {
    // Check if click was on pattern control button
    if (event.target.id === 'random-pattern') {
        event.stopPropagation(); // Prevent game area click
        changePattern();
        return;
    }

    // Handle regular game area click
    if (!gameStarted || gameStatus) return;
    verifyCaptcha(patternIndex);
}

// Game constants
const RADIUS = 200;
const CENTER = { x: RADIUS, y: RADIUS };
const BALL_SIZE = 24;
const TARGET_SIZE = 28;
const NOISE_SIZE = 16;
const PATTERN_DURATION = 5;
const SPEED_MULTIPLIER = 3
const FIGURE_8_PATTERN_INDEX = 2;
const NUM_NOISE_CIRCLES = 8;

// Game state
let gameStarted = false;
let gameStatus = null;
let time = 0;
let patternIndex = 0;
let cursorPosition = { x: 0, y: 0 };
let targetPosition = { x: 100, y: 0 };
let noisePositions = [];
let animationFrameId;
let winningPatternIndex;
let patternToWatch;

const patternNames = [
    "Circle",
    "Square",
    "Figure-8",
    "Triangle",
    "Zigzag"
];

// Generate noise patterns
function generateNoisePatterns() {
    return Array(NUM_NOISE_CIRCLES).fill(null).map(() => {
        const speed = 0.003 + Math.random() * 0.004;
        const radius = RADIUS * (0.3 + Math.random() * 0.3);
        const phase = Math.random() * Math.PI * 2;
        const centerOffset = {
            x: (Math.random() - 0.5) * RADIUS * 0.5,
            y: (Math.random() - 0.5) * RADIUS * 0.5
        };
        
        return (t) => ({
            x: CENTER.x + centerOffset.x + Math.cos(t * speed + phase) * radius,
            y: CENTER.y + centerOffset.y + Math.sin(t * speed + phase) * radius
        });
    });
}

const noisePatterns = generateNoisePatterns();

// Movement patterns
const patterns = [
    // Circle pattern
    (t) => {
        const angle = t * 0.002;
        return {
            x: CENTER.x + Math.cos(angle) * (RADIUS * 0.7),
            y: CENTER.y + Math.sin(angle) * (RADIUS * 0.7)
        };
    },
    
    // Square pattern
    (t) => {
        const period = 4000;
        const normalizedTime = (t % period) / period;
        const side = RADIUS * 1.2;
        if (normalizedTime < 0.25) {
            return {
                x: CENTER.x - side/2 + (side * normalizedTime * 4),
                y: CENTER.y - side/2
            };
        } else if (normalizedTime < 0.5) {
            return {
                x: CENTER.x + side/2,
                y: CENTER.y - side/2 + (side * (normalizedTime - 0.25) * 4)
            };
        } else if (normalizedTime < 0.75) {
            return {
                x: CENTER.x + side/2 - (side * (normalizedTime - 0.5) * 4),
                y: CENTER.y + side/2
            };
        } else {
            return {
                x: CENTER.x - side/2,
                y: CENTER.y + side/2 - (side * (normalizedTime - 0.75) * 4)
            };
        }
    },
    
    // Figure-8 pattern (winning pattern)
    (t) => {
        const angle = t * 0.002;
        return {
            x: CENTER.x + Math.sin(angle * 2) * (RADIUS * 0.7),
            y: CENTER.y + Math.sin(angle) * (RADIUS * 0.5)
        };
    },
    
    // Triangle pattern
    (t) => {
        const period = 3000;
        const normalizedTime = (t % period) / period;
        const side = RADIUS * 1.2;
        const height = side * Math.sqrt(3) / 2;
        
        if (normalizedTime < 0.33) {
            const progress = normalizedTime * 3;
            return {
                x: CENTER.x - side/2 + (side * progress),
                y: CENTER.y + height/3
            };
        } else if (normalizedTime < 0.66) {
            const progress = (normalizedTime - 0.33) * 3;
            return {
                x: CENTER.x + side/2 - (side/2 * progress),
                y: CENTER.y + height/3 - (height * progress)
            };
        } else {
            const progress = (normalizedTime - 0.66) * 3;
            return {
                x: CENTER.x - (side/2 * (1 - progress)),
                y: CENTER.y - height * (2/3) + (height * progress)
            };
        }
    },
    
    // Zigzag pattern
    (t) => {
        const frequency = 0.003;
        const amplitude = RADIUS * 0.7;
        return {
            x: CENTER.x + Math.sin(t * frequency) * amplitude,
            y: CENTER.y + ((t % (2 * amplitude)) - amplitude)
        };
    }
];

async function initializeCaptcha() {
    try {
        const response = await fetch(`${API_URL}/init`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                domain: window.location.origin
            })
        });

        const data = await response.json();
        if (data.token) {
            captchaToken = data.token;
            // Update pattern information from backend
            winningPatternIndex = data.pattern_index;
            patternToWatch = data.pattern;
            document.getElementById('target-pattern').textContent = patternToWatch;
            return true;
        }
        return false;
    } catch (error) {
        console.error('Failed to initialize captcha:', error);
        return false;
    }
}

async function verifyCaptcha(patternIndex) {
    try {
        const response = await fetch(`${API_URL}/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: captchaToken,
                pattern_index: patternIndex
            })
        });

        const data = await response.json();
        return {
            success: data.success,
            message: data.message,
            newToken: data.verification_token
        };
    } catch (error) {
        console.error('Failed to verify captcha:', error);
        return { success: false, message: 'Verification failed' };
    }
}

async function startGame() {
    const initialized = await initializeCaptcha();
    
    // Initialize blockchain and add new score
    const blockchain = new Blockchain();
    blockchain.loadChain();
    blockchain.addScore(5, "Game Started Score"); // Add 5 points when game starts
    await blockchain.minePendingScores(); // Mine the pending scores

    if (!initialized) {
        alert('Failed to initialize verification. Please try again.');
        return;
    }

    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    gameStarted = true;
    gameStatus = null;
    time = 0;
    patternIndex = 0;
    startAnimation();

    // Check total score after mining
    const totalScore = blockchain.getTotalScore();
    console.log('Current total score:', totalScore);
    if (totalScore >= 50) {
        endGame('won');
    }
}

function handleMouseMove(event) {
}

function handleMouseLeave() {
 
}

function endGame(status) {
    gameStatus = status;
    cancelAnimationFrame(animationFrameId);
    
    const statusElement = document.getElementById('status');
    statusElement.textContent = status === 'won' ? 'Verification Successful ✓' : 'Verification Failed ✗';
    statusElement.className = `status ${status}`;

    const gameArea = document.getElementById('game-area');
    gameArea.className = `game-area ${status}`;

    if (status === 'lost') {
        setTimeout(() => {
            resetGame(); 
        }, 2000);
    } else {
        const playAgainButton = document.createElement('button');
        playAgainButton.className = 'button';
        playAgainButton.textContent = 'Verify Again';
        playAgainButton.onclick = resetGame;
        statusElement.appendChild(document.createElement('br'));
        statusElement.appendChild(playAgainButton);

      
    }
}

function resetGame() {
    const gameArea = document.getElementById('game-area');
    gameArea.className = 'game-area';
    
    const statusElement = document.getElementById('status');
    statusElement.textContent = '';
    statusElement.className = 'status';
    
    // Initialize new captcha instead of selecting random pattern
    initializeCaptcha().then(initialized => {
        if (initialized) {
            gameStarted = true;
            gameStatus = null;
            time = 0;
            patternIndex = 0;
            startAnimation();
            updatestartextime();
        } else {
            alert('Failed to initialize verification. Please try again.');
        }
    });
}

function updatePlayerBall() {
    const playerBall = document.getElementById('player-ball');
    if (playerBall) {
        playerBall.style.left = `${cursorPosition.x - BALL_SIZE / 2}px`;
        playerBall.style.top = `${cursorPosition.y - BALL_SIZE / 2}px`;
    }
}

function updateTarget() {
    const target = document.getElementById('target');
    if (target) {
        target.style.left = `${targetPosition.x - TARGET_SIZE / 2}px`;
        target.style.top = `${targetPosition.y - TARGET_SIZE / 2}px`;
        target.className = `target ${patternIndex === winningPatternIndex ? 'winning' : 'losing'}`;
    }
}

function updateNoiseCircles() {
    const gameArea = document.getElementById('game-area');
    const existingNoise = document.querySelectorAll('.noise-circle');
    existingNoise.forEach(el => el.remove());
    const colors = ['#ee6352', '#08b2e3', '#efe9f4', '#73D997', '#484d6d', '#BEA7E5', '#9B59B6', '#ee6352'];

    noisePositions.forEach((pos, index) => {
        const noise = document.createElement('div');
        noise.className = 'noise-circle';
        noise.style.transition = 'all 2s ease-out';
        noise.style.left = `${pos.x - NOISE_SIZE / 2}px`;
        noise.style.top = `${pos.y - NOISE_SIZE / 2}px`;
        // Use time to cycle through colors
        const colorIndex = (index + Math.floor(time/500)) % colors.length;
        noise.style.backgroundColor = colors[colorIndex];
        gameArea.appendChild(noise);
    });
}
function updatestartextime(){
    const timerElement = document.getElementById('exp_time');  
    if (!timerElement) return;
    
    const remainingTime = 35 - Math.floor((time / 1000) % 35);
    timerElement.textContent = `verification expiration ${remainingTime}s`;
    
    if (remainingTime <= 1 ) {
        document.getElementById('start-screen').style.display = 'block';
        document.getElementById('game-screen').style.display = 'none';
        time = 0;
    }
}

function updateTimer() {
    const timerElement = document.getElementById('timer');
    if (timerElement) {
        timerElement.textContent = `Pattern changes in: ${PATTERN_DURATION - Math.floor((time / 1000) % PATTERN_DURATION)}s`;
    }
    
}
function animate(currentTime) {
    if (!gameStarted || gameStatus) return;

    const deltaTime = currentTime - (time || currentTime);
    time = currentTime;

    if (Math.floor((time - deltaTime) / (PATTERN_DURATION * 1000)) !== 
        Math.floor(time / (PATTERN_DURATION * 1000))) {
        patternIndex = (patternIndex + 1) % patterns.length;
    }

    targetPosition = patterns[patternIndex](time);
    noisePositions = noisePatterns.map(pattern => pattern(time));
    
    updateTarget();
    updateNoiseCircles();
    updateTimer();
    updatestartextime();
    animationFrameId = requestAnimationFrame(animate);
}

function startAnimation() {
    // Create game elements
    const gameArea = document.getElementById('game-area');
    
    // Create player ball
    const playerBall = document.createElement('div');
    playerBall.id = 'player-ball';
    playerBall.className = 'player-ball';
    gameArea.appendChild(playerBall);

    // Create target
    const target = document.createElement('div');
    target.id = 'target';
    target.className = 'target';
    gameArea.appendChild(target);

    // Start animation
    animationFrameId = requestAnimationFrame(animate);
}
// Add this after the other game functions
function changePattern() {
    if (!gameStarted || gameStatus) return;

    // Update pattern index
    patternIndex = (patternIndex + 1) % patterns.length;
    
    // Add visual feedback for pattern change
    const button = document.getElementById('random-pattern');
    button.classList.add('active');
    
    // Update pattern name display
    document.getElementById('pattern-indicator').textContent = patternNames[patternIndex];
    
    // Reset animation timer
    time = 0;
    
    // Add rotation animation to target
    const target = document.getElementById('target');
    if (target) {
        target.style.transition = 'transform 0.3s ease-out';
        target.style.transform = 'scale(1.2) rotate(360deg)';
        setTimeout(() => {
            target.style.transform = 'scale(1) rotate(0deg)';
        }, 300);
    }
    
    // Remove active class after animation
    setTimeout(() => {
        button.classList.remove('active');
    }, 300);
}
class Block {
    constructor(index, timestamp, data, previousHash) {
        this.index = index;
        this.timestamp = timestamp;
        this.data = data || { score: 0, description: "" };
        this.previousHash = previousHash || '';
        this.hash = '';
        this.nonce = 0;
    }

    calculateHash() {
        return CryptoJS.SHA256(
            this.index +
            this.previousHash +
            this.timestamp +
            JSON.stringify(this.data) +
            this.nonce
        ).toString();
    }

    async mineBlock(difficulty) {
        const startTime = Date.now();
        const target = '0'.repeat(difficulty);
        const miningStatus = document.getElementById('mining-status');

        while (this.hash.substring(0, difficulty) !== target) {
            this.nonce++;
            this.hash = this.calculateHash();

            if (this.nonce % 10000 === 0) {
                const elapsed = (Date.now() - startTime) / 1000;
                const hashRate = Math.floor(this.nonce / elapsed);
                
                if (miningStatus) {
                    miningStatus.textContent = 
                        `Mining... Hashes: ${this.nonce.toLocaleString()} (${hashRate.toLocaleString()} h/s), ` +
                        `Time: ${elapsed.toFixed(1)}s`;
                }
                
                // Allow UI to update
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        const elapsed = (Date.now() - startTime) / 1000;
        if (miningStatus) {
            miningStatus.textContent = 
                `Block mined in ${elapsed.toFixed(2)}s with nonce ${this.nonce.toLocaleString()}`;
        }
    }
}

    // // Blockchain class
    function Blockchain() {
        // Initialize properties
        this.chain = [];
        this.difficulty = 4;
        this.pendingScores = [];
        
        // Method definitions
        this.createGenesisBlock = function() {
            return new Block(0, Date.now(), {score: 0, description: "Genesis Block"}, '0');
        };
        
        this.getLatestBlock = function() {
            return this.chain[this.chain.length - 1];
        };
        
        this.addScore = function(newScore, description) {
            this.pendingScores.push({
                score: newScore,
                description: description || `Score added at ${new Date().toLocaleString()}`
            });
        };
        
        this.minePendingScores = function() {
            if (this.pendingScores.length === 0) {
                return Promise.resolve();
            }
            
            const minePromises = [];
            
            for (const scoreData of this.pendingScores) {
                const newBlock = new Block(
                    this.chain.length,
                    Date.now(),
                    scoreData,
                    this.getLatestBlock().hash
                );
                
                minePromises.push(new Promise(resolve => {
                    setTimeout(() => {
                        newBlock.mineBlock(this.difficulty);
                        this.chain.push(newBlock);
                        resolve();
                    }, 0);
                }));
            }
            
            return Promise.all(minePromises).then(() => {
                this.pendingScores = [];
                this.saveChain();
            });
        };
        
        this.saveChain = function() {
            localStorage.setItem('scoreChain', JSON.stringify(this.chain));
        };
        
        this.loadChain = function() {
            const savedChain = localStorage.getItem('scoreChain');
            if (savedChain) {
                try {
                    const parsedChain = JSON.parse(savedChain);
                    this.chain = parsedChain.map(blockData => {
                        const block = new Block(
                            blockData.index,
                            blockData.timestamp,
                            blockData.data,
                            blockData.previousHash
                        );
                        block.hash = blockData.hash;
                        block.nonce = blockData.nonce;
                        return block;
                    });
                } catch (e) {
                    console.error('Error loading chain:', e);
                    this.chain = [this.createGenesisBlock()];
                }
            } else {
                this.chain = [this.createGenesisBlock()];
            }
        };
        
        this.isChainValid = function() {
            for (let i = 1; i < this.chain.length; i++) {
                const currentBlock = this.chain[i];
                const previousBlock = this.chain[i - 1];
                
                if (currentBlock.hash !== currentBlock.calculateHash()) {
                    return false;
                }
                
                if (currentBlock.previousHash !== previousBlock.hash) {
                    return false;
                }
            }
            return true;
        };
        
        this.getTotalScore = function() {
            let total = 0;
            for (const block of this.chain) {
                if (block.data && block.data.score) {
                    // Use base 10 for parsing integers and handle invalid values
                    const score = parseInt(block.data.score, 10);
                    if (!isNaN(score)) {
                        total += score;
                    }
                }
            }
            return total;
        };
        
        // Initialize the chain
        this.loadChain();
    }

// // Add a new function to update score display
// function displayBlockchainData() {
//     const blockchain = new Blockchain();
//     blockchain.loadChain();
    
//     // Create or get the display container
//     let displayDiv = document.getElementById('blockchain-display');
//     if (!displayDiv) {
//         displayDiv = document.createElement('div');
//         displayDiv.id = 'blockchain-display';
//         document.querySelector('.game-container').appendChild(displayDiv);
//     }
    
//     // Clear previous content
//     displayDiv.innerHTML = `
//         <h3>Blockchain Data</h3>
//         <div class="chain-info">
//             <p>Total Score: ${blockchain.getTotalScore()}</p>
//             <p>Chain Length: ${blockchain.chain.length}</p>
//             <p>Pending Scores: ${blockchain.pendingScores.length}</p>
//             <p>Mining Difficulty: ${blockchain.difficulty}</p>
//         </div>
//         <div class="blocks-container"></div>
//     `;

//     // Add each block's data
//     const blocksContainer = displayDiv.querySelector('.blocks-container');
//     blockchain.chain.forEach((block, index) => {
//         const blockDiv = document.createElement('div');
//         blockDiv.className = 'block-data';
//         blockDiv.innerHTML = `
//             <h4>Block #${block.index}</h4>
//             <p>Timestamp: ${new Date(block.timestamp).toLocaleString()}</p>
//             <p>Score: ${block.data.score}</p>
//             <p>Description: ${block.data.description}</p>
//             <p>Hash: ${block.hash.substring(0, 20)}...</p>
//             <p>Previous Hash: ${block.previousHash.substring(0, 20)}...</p>
//             <p>Nonce: ${block.nonce}</p>
//         `;
//         blocksContainer.appendChild(blockDiv);
//     });
// }
