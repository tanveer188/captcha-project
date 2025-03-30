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

async function handleClick() {
    if (!gameStarted || gameStatus) return;
    const result = await verifyCaptcha(patternIndex);
    if (result.success) {
        captchaToken = result.newToken;
        endGame('won');
    } else {
        endGame('lost');
    }
}

// Update the click event handler
function pattern(event) {
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
const SPEED_MULTIPLIER = 3;
const FIGURE_8_PATTERN_INDEX = 2;
const NUM_NOISE_CIRCLES = 8;
const TRAIL_LENGTH = 10; // Number of trail dots
const TRAIL_OPACITY_STEP = 0.7; // Fade rate for trail
let trailPositions = []; // Will store recent positions for the trail

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

// Utility function for easing
function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

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
        const period = 3500; // Slightly longer period for better visibility
        const normalizedTime = (t % period) / period;
        
        // Define the vertices of a clear equilateral triangle
        const vertices = [
            { x: CENTER.x, y: CENTER.y - RADIUS * 0.6 },                // Top point
            { x: CENTER.x - RADIUS * 0.6, y: CENTER.y + RADIUS * 0.4 }, // Bottom left
            { x: CENTER.x + RADIUS * 0.6, y: CENTER.y + RADIUS * 0.4 }  // Bottom right
        ];
        
        let currentPoint, nextPoint;
        
        // Move between vertices with clear pauses at each corner
        if (normalizedTime < 0.3) {
            // Move from top to bottom right (with slight pause at top)
            const segmentTime = normalizedTime / 0.3;
            const moveTime = Math.min(1, segmentTime * 1.2); // Adjust for pause
            
            currentPoint = vertices[0];
            nextPoint = vertices[2];
        } 
        else if (normalizedTime < 0.6) {
            // Move from bottom right to bottom left (with slight pause at bottom right)
            const segmentTime = (normalizedTime - 0.3) / 0.3;
            const moveTime = Math.min(1, segmentTime * 1.2); // Adjust for pause
            
            currentPoint = vertices[2];
            nextPoint = vertices[1];
        }
        else {
            // Move from bottom left to top (with slight pause at bottom left)
            const segmentTime = (normalizedTime - 0.6) / 0.4;
            const moveTime = Math.min(1, segmentTime * 1.2); // Adjust for pause
            
            currentPoint = vertices[1];
            nextPoint = vertices[0];
        }
        
        // Add easing for smoother movement
        const progress = easeInOutQuad(normalizedTime % 0.3 / 0.3);
        
        return {
            x: currentPoint.x + (nextPoint.x - currentPoint.x) * progress,
            y: currentPoint.y + (nextPoint.y - currentPoint.y) * progress
        };
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

// Add this function to create a persistent help button that's always visible
function createHelpButton() {
    // Check if help button already exists
    if (document.getElementById('help-button')) {
        return;
    }
    
    const gameContainer = document.querySelector('.game-container');
    if (!gameContainer) return;
    
    const helpButton = document.createElement('button');
    helpButton.id = 'help-button';
    helpButton.className = 'control-button help-btn';
    helpButton.innerHTML = '?';
    helpButton.title = 'Show Help';
    helpButton.style.position = 'absolute';
    helpButton.style.top = '10px';
    helpButton.style.right = '10px';
    helpButton.style.zIndex = '20';
    helpButton.addEventListener('click', showHelpModal);
    
    gameContainer.appendChild(helpButton);
}

// Call this function at the beginning of your game initialization
// Update the startGame function to create the help button
async function startGame() {
    const initialized = await initializeCaptcha();
    
    // Initialize blockchain and add new score
    const blockchain = new Blockchain();
    blockchain.loadChain();
    blockchain.addScore(5, "Game Started Score");
    await blockchain.minePendingScores();

    if (!initialized) {
        alert('Failed to initialize verification. Please try again.');
        return;
    }
    
    // Create the help button first so it's available throughout the game
    createHelpButton();

    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    gameStarted = true;
    gameStatus = null;
    time = 0;
    patternIndex = 0;
    startAnimation();

    // Show help for first-time users
    if (!localStorage.getItem('captchaHelpShown')) {
        setTimeout(() => {
            showHelpModal();
            localStorage.setItem('captchaHelpShown', 'true');
        }, 500);
    }

    // Check total score after mining
    const totalScore = blockchain.getTotalScore();
    console.log('Current total score:', totalScore);
    if (totalScore >= 50) {
        endGame('won');
    }
}

function handleMouseMove(event) {
    if (!gameStarted || gameStatus) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    cursorPosition.x = event.clientX - rect.left;
    cursorPosition.y = event.clientY - rect.top;
    
    // Update player ball position
    updatePlayerBall();
}

function handleMouseLeave() {
}

function endGame(status) {
    gameStatus = status;
    cancelAnimationFrame(animationFrameId);
    
    const gameArea = document.getElementById('game-area');
    gameArea.className = `game-area ${status}`;
    
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
        playAgainButton.id = 'play-again-btn';
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
    
    // Use a single color for all noise circles instead of an array of colors
    const noiseColor = '#73D997'; // You can choose any color you prefer
    
    noisePositions.forEach((pos) => {
        const noise = document.createElement('div');
        noise.className = 'noise-circle';
        noise.style.transition = 'all 2s ease-out';
        noise.style.left = `${pos.x - NOISE_SIZE / 2}px`;
        noise.style.top = `${pos.y - NOISE_SIZE / 2}px`;
        noise.style.backgroundColor = noiseColor;
        gameArea.appendChild(noise);
    });
}

function updatestartextime(){
    const timerElement = document.getElementById('exp_time');  
    if (!timerElement) return;
    
    const remainingTime = 35 - Math.floor((time / 1000) % 35);
    timerElement.textContent = `verification expiration ${remainingTime}s`;
    
    // Add warning class when time is running low
    if (remainingTime <= 10) {
        timerElement.classList.add('warning');
    } else {
        timerElement.classList.remove('warning');
    }
    
    // Handle expiration
    if (remainingTime <= 0) {
        endGame('lost');
        document.getElementById('start-screen').style.display = 'block';
        document.getElementById('game-screen').style.display = 'none';
        time = 0;
        const blockchain = new Blockchain();
        blockchain.loadChain();
        blockchain.addScore(-2, "Verification Expired"); // Penalty for expiration
        blockchain.minePendingScores();
    }
}

function updateTimer() {
    const timerElement = document.getElementById('timer');
    if (timerElement) {
        timerElement.textContent = `Pattern changes in: ${PATTERN_DURATION - Math.floor((time / 1000) % PATTERN_DURATION)}s`;
    }
}

function updateTrail() {
    const gameArea = document.getElementById('game-area');
    
    // Remove old trail elements
    const existingTrail = document.querySelectorAll('.trail-dot');
    existingTrail.forEach(el => el.remove());
    
    // Add the current position to the trail and maintain trail length
    trailPositions.unshift({...targetPosition});
    if (trailPositions.length > TRAIL_LENGTH) {
        trailPositions = trailPositions.slice(0, TRAIL_LENGTH);
    }
    
    // Create trail dots with decreasing opacity
    trailPositions.forEach((pos, index) => {
        const opacity = Math.pow(TRAIL_OPACITY_STEP, index);
        if (opacity < 0.05) return; // Skip nearly invisible dots
        
        const trailDot = document.createElement('div');
        trailDot.className = 'trail-dot';
        const size = TARGET_SIZE * (1 - index * 0.07); // Slightly decreasing size
        
        trailDot.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${pos.x - size/2}px;
            top: ${pos.y - size/2}px;
            background-color: rgba(239, 68, 68, ${opacity});
            border-radius: 50%;
            z-index: 4;
            pointer-events: none;
        `;
        
        gameArea.appendChild(trailDot);
    });
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
    updateTrail();
    updateNoiseCircles();
    updateTimer();
    updatestartextime();
    animationFrameId = requestAnimationFrame(animate);
}

function setupGameEventListeners() {
    const gameArea = document.getElementById('game-area');
    
    // Add click event listener to the game area
    gameArea.addEventListener('click', function(event) {
        // Prevent handling clicks if not clicking directly on the game area
        if (event.target !== gameArea && 
            !event.target.classList.contains('target') && 
            !event.target.classList.contains('player-ball') &&
            !event.target.classList.contains('trail-dot')) {
            return;
        }
        
        if (!gameStarted || gameStatus) return;
        
        // Check if the current pattern is the winning pattern
        if (patternIndex === winningPatternIndex) {
            verifyCaptcha(patternIndex).then(result => {
                if (result.success) {
                    captchaToken = result.newToken;
                    endGame('won');
                } else {
                    endGame('lost');
                }
            });
        } else {
            // Wrong pattern was clicked
            endGame('lost');
        }
    });
    
    // Make sure random pattern button has event listener
    const randomButton = document.getElementById('random-pattern');
    if (randomButton) {
        randomButton.addEventListener('click', changePattern);
    }
    
    // Set mouse move event listener
    gameArea.addEventListener('mousemove', handleMouseMove);
    gameArea.addEventListener('mouseleave', handleMouseLeave);
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

    // Set up event listeners
    setupGameEventListeners();

    // Show help instructions only on first run
    if (!localStorage.getItem('captchaHelpShown')) {
        showHelpModal();
        localStorage.setItem('captchaHelpShown', 'true');
    }

    // Start animation
    animationFrameId = requestAnimationFrame(animate);
}

// Update showHelpModal to not create another help button
function showHelpModal() {
    const modal = document.createElement('div');
    modal.className = 'help-modal';
    
    // Create pattern demonstrations
    const patternDemos = createPatternDemos();
    
    modal.innerHTML = `
        <div class="help-content">
            <h3>How to Complete Verification</h3>
            <p>Follow these steps to verify you're human:</p>
            <ol>
                <li>Watch the <span style="color: #ef4444;">red dot</span> moving in different patterns</li>
                <li>You need to recognize the <strong>${patternNames[winningPatternIndex]}</strong> pattern</li>
                <li>Use the <button style="display:inline-block; width:25px; height:25px; line-height:25px; border-radius:50%; background:#f0f0f5; border:none; font-size:14px;">⟳</button> button to change patterns</li>
                <li>When you see the <strong>${patternNames[winningPatternIndex]}</strong> pattern, click it to verify</li>
                <li>You have 100 seconds to complete the verification</li>
            </ol>
            
            <div class="pattern-examples">
                <h4>Pattern Examples:</h4>
                <div class="demo-container">${patternDemos}</div>
            </div>
            
            <button id="close-help" class="button">Got it!</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Start pattern animations
    animatePatternDemos();
    
    // Remove the code that adds a help button since we now have a persistent one
    
    document.getElementById('close-help').addEventListener('click', () => {
        modal.classList.add('fadeout');
        setTimeout(() => modal.remove(), 500);
    });
}

function createPatternDemos() {
    // Create mini demos of each pattern
    let demosHTML = '';
    
    patternNames.forEach((name, index) => {
        const isWinningPattern = (index === winningPatternIndex);
        demosHTML += `
            <div class="pattern-demo ${isWinningPattern ? 'winning-pattern' : ''}">
                <div class="demo-title">
                    ${name} 
                    ${isWinningPattern ? '<span style="color: #22c55e; font-weight: bold;">✓ Target</span>' : ''}
                </div>
                <div class="demo-canvas" id="demo-${index}">
                    <div class="demo-dot" id="dot-${index}"></div>
                    <svg width="100" height="100" id="svg-${index}">
                        <path d="" stroke="rgba(239, 68, 68, 0.2)" stroke-width="2" fill="none" id="path-${index}"/>
                    </svg>
                </div>
                <div class="pattern-speed-indicator">
                    <div class="speed-label">Speed: </div>
                    <div class="speed-value">Slow (Demo)</div>
                    <div class="speed-note">Actual game: 2× faster</div>
                </div>
            </div>
        `;
    });
    
    return demosHTML;
}

function animatePatternDemos() {
    const demoFrames = [];
    const svgPaths = [];
    const pathData = {};
    
    // Initialize path data for each pattern
    patternNames.forEach((_, index) => {
        pathData[index] = [];
    });
    
    // Animation function for each demo - SLOWED DOWN
    function animateDemo(timestamp) {
        const frameDuration = 20; // ms between frames
        
        patternNames.forEach((_, index) => {
            const demoCanvas = document.getElementById(`demo-${index}`);
            if (!demoCanvas) return;
            
            const dot = document.getElementById(`dot-${index}`);
            const svg = document.getElementById(`svg-${index}`);
            const path = document.getElementById(`path-${index}`);
            
            if (!dot || !svg || !path) return;
            
            // Calculate animation progress - SLOWED DOWN (4 seconds instead of 2)
            const t = (timestamp % 4000) * 2.5; // Slowed down by half
            
            // Get pattern position scaled to the demo size
            const pattern = patterns[index];
            const fullPos = pattern(t);
            
            // Scale position to fit demo canvas (50x50 centered)
            const scaleFactor = 0.2;
            const pos = {
                x: 50 + (fullPos.x - CENTER.x) * scaleFactor,
                y: 50 + (fullPos.y - CENTER.y) * scaleFactor
            };
            
            // Update dot position
            dot.style.left = `${pos.x - 4}px`;
            dot.style.top = `${pos.y - 4}px`;
            
            // Store path data (limited to prevent too many points)
            if (timestamp % frameDuration === 0) {
                pathData[index].push(pos);
                if (pathData[index].length > 100) {
                    pathData[index].shift();
                }
                
                // Update SVG path
                let pathString = '';
                pathData[index].forEach((p, i) => {
                    pathString += (i === 0 ? 'M' : 'L') + p.x + ',' + p.y;
                });
                path.setAttribute('d', pathString);
            }
        });
        
        // Continue animation
        demoFrames.push(requestAnimationFrame(animateDemo));
    }
    
    // Start animations
    demoFrames.push(requestAnimationFrame(animateDemo));
    
    // Stop animations when the modal is closed
    document.getElementById('close-help').addEventListener('click', () => {
        demoFrames.forEach(frame => cancelAnimationFrame(frame));
    });
}

function changePattern() {
    if (!gameStarted || gameStatus) return;

    // Update pattern index
    patternIndex = (patternIndex + 1) % patterns.length;
    
    // Add visual feedback for pattern change
    const button = document.getElementById('random-pattern');
    button.classList.add('active');
    
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

function Blockchain() {
    this.chain = [];
    this.difficulty = 4;
    this.pendingScores = [];
    
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
                const score = parseInt(block.data.score, 10);
                if (!isNaN(score)) {
                    total += score;
                }
            }
        }
        return total;
    };
    
    this.loadChain();
}

// Add this to your window.onload or in an initialization function
window.addEventListener('DOMContentLoaded', function() {
    // Create help button when the page loads
    createHelpButton();
});
