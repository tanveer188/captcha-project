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

async function startGame() {
    const data = await initializeCaptcha();
    if (!data) return;

    messageElement.textContent = 'Watch the pattern and select it below!';
    messageElement.style.color = '#ffffff';
    playAgainButton.style.display = 'none';
    
    isGameActive = true;
    gameStartTime = Date.now();
    updateBallPosition();
}

function resetGame() {
    stopGame();
    startGame();
}

function handleMouseMove(event) {
    if (!isGameActive) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    ball.style.left = `${event.clientX - rect.left - 12}px`;
    ball.style.top = `${event.clientY - rect.top - 12}px`;
}

function handleMouseLeave() {
    // Empty function to prevent any action when mouse leaves the game area
    // This keeps the game running when the cursor moves outside the circle
}

function handleClick() {
    if (!isGameActive) return;
    verifyCaptcha(0);
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

// Add a heart pattern to the patternNames array
const patternNames = [
    "Circle",
    "Square",
    "Figure-8",
    "Triangle",
    "Zigzag",
    "Heart"  // Add the new pattern name
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
    
    // Triangle pattern with increased speed
    (t) => {
        // Faster triangle pattern with better visibility
        const period = 2500; // Reduced from 4000 to 2500 for faster movement
        const normalizedTime = (t % period) / period;
        
        // Use equilateral triangle dimensions
        const side = RADIUS * 1.0;
        const height = side * Math.sqrt(3) / 2;
        
        // Define the three vertices of the triangle
        const vertices = [
            { x: CENTER.x, y: CENTER.y - height * 0.6 },           // Top vertex
            { x: CENTER.x - side/2, y: CENTER.y + height * 0.4 },  // Bottom left
            { x: CENTER.x + side/2, y: CENTER.y + height * 0.4 }   // Bottom right
        ];
        
        // Function to pause at vertices (slightly shortened pauses)
        const getSegmentProgress = (progress) => {
            // Reduced pause time to 20% at vertices instead of 30%
            if (progress < 0.2) return 0;
            if (progress > 0.8) return 1;
            return (progress - 0.2) / 0.6;
        };
        
        // First segment: Top to bottom left
        if (normalizedTime < 0.33) {
            const segmentProgress = getSegmentProgress(normalizedTime * 3);
            return {
                x: vertices[0].x + (vertices[1].x - vertices[0].x) * segmentProgress,
                y: vertices[0].y + (vertices[1].y - vertices[0].y) * segmentProgress
            };
        } 
        // Second segment: Bottom left to bottom right
        else if (normalizedTime < 0.66) {
            const segmentProgress = getSegmentProgress((normalizedTime - 0.33) * 3);
            return {
                x: vertices[1].x + (vertices[2].x - vertices[1].x) * segmentProgress,
                y: vertices[1].y + (vertices[2].y - vertices[1].y) * segmentProgress
            };
        } 
        // Third segment: Bottom right to top
        else {
            const segmentProgress = getSegmentProgress((normalizedTime - 0.66) * 3);
            return {
                x: vertices[2].x + (vertices[0].x - vertices[2].x) * segmentProgress,
                y: vertices[2].y + (vertices[0].y - vertices[2].y) * segmentProgress
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
    },
    
    // Heart pattern (new)
    (t) => {
        const period = 5000; // 5 seconds for a full cycle
        const normalizedTime = (t % period) / period;
        const scale = RADIUS * 0.8; // Scale to fit within the game area
        
        // Parametric equation for a heart shape
        // x = 16 * sin(t)^3
        // y = 13 * cos(t) - 5 * cos(2t) - 2 * cos(3t) - cos(4t)
        
        const angle = normalizedTime * Math.PI * 2;
        
        // Calculate heart coordinates
        // We use classic heart parametric equations, adjusted to move clockwise
        const heartX = scale * Math.pow(Math.sin(angle), 3);
        // Adjust the heart equation to get a better shape
        const heartY = -scale * (
            0.8 * Math.cos(angle) - 
            0.3 * Math.cos(2 * angle) - 
            0.15 * Math.cos(3 * angle) - 
            0.05 * Math.cos(4 * angle)
        );
        
        return {
            x: CENTER.x + heartX,
            y: CENTER.y + heartY * 0.8  // Slightly compress vertically
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

function handleMouseMove(event) {
    if (!gameStarted || gameStatus) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    cursorPosition = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
    updatePlayerBall();
}

function handleMouseLeave() {
    // Empty function to prevent any action when mouse leaves the game area
    // This keeps the game running when the cursor moves outside the circle
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
        handleMouseLeave();
    }
}

// Add these functions for pattern navigation
function nextPattern() {
    if (!gameStarted || gameStatus) return;
    patternIndex = (patternIndex + 1) % patterns.length;
    updatePatternIndicator();
}

function prevPattern() {
    if (!gameStarted || gameStatus) return;
    patternIndex = (patternIndex - 1 + patterns.length) % patterns.length;
    updatePatternIndicator();
}

function updatePatternIndicator() {
    const indicator = document.getElementById('pattern-indicator');
    if (indicator) {
        indicator.textContent = `${patternNames[patternIndex]} (${patternIndex + 1}/${patterns.length})`;
    }
}

// Modify the randomSwitchPattern function to prevent switching mid-pattern
function randomSwitchPattern() {
    if (!gameStarted || gameStatus) return;
    
    // Save current time position to track pattern completion
    const currentPatternTime = time % 5000; // Assuming 5000ms is the pattern period
    
    // Only switch if we're near the beginning or end of a pattern cycle
    // This prevents interrupting mid-pattern, especially noticeable with the heart
    if (currentPatternTime < 500 || currentPatternTime > 4500) {
        // Generate a random pattern index different from the current one
        let newPatternIndex;
        do {
            newPatternIndex = Math.floor(Math.random() * patterns.length);
        } while (newPatternIndex === patternIndex);
        
        patternIndex = newPatternIndex;
        updatePatternIndicator();
    }
}

// Modify the animate function to remove automatic pattern switching
function animate(currentTime) {
    if (!gameStarted || gameStatus) return;

    const deltaTime = currentTime - (time || currentTime);
    time = currentTime;

    targetPosition = patterns[patternIndex](time);
    noisePositions = noisePatterns.map(pattern => pattern(time));

    updateTarget();
    updateNoiseCircles();
    updateTimer();
    updatestartextime();
    animationFrameId = requestAnimationFrame(animate);
}

// Modify the updateTimer function since we're not auto-changing patterns
function updateTimer() {
    const timerElement = document.getElementById('timer');
    if (timerElement) {
        // Change the message since we're not auto-switching patterns anymore
        timerElement.textContent = `Current pattern: ${patternNames[patternIndex]}`;
    }
}

// Also update the interval-based pattern switching in startAnimation
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

    // Set up random pattern button
    const randomButton = document.getElementById('random-pattern');
    
    if (randomButton) {
        randomButton.addEventListener('click', () => {
            // For manual clicks, always switch the pattern regardless of timing
            let newPatternIndex;
            do {
                newPatternIndex = Math.floor(Math.random() * patterns.length);
            } while (newPatternIndex === patternIndex);
            
            patternIndex = newPatternIndex;
            updatePatternIndicator();
            
            // Reset last switch time to prevent immediate auto-switching
            lastSwitchTime = Date.now();
        });
        
        // Add a clock-based trigger for random pattern switching
        let lastSwitchTime = Date.now();
        const clockSwitchInterval = 8000; // Increased to 8 seconds for better pattern visibility
        
        setInterval(() => {
            const currentTime = Date.now();
            if (gameStarted && !gameStatus && (currentTime - lastSwitchTime) >= clockSwitchInterval) {
                // Use the modified randomSwitchPattern for auto-switching
                // which respects pattern completion
                randomSwitchPattern();
                lastSwitchTime = currentTime;
                
                // Add a visual feedback that the button has been "clicked"
                randomButton.classList.add('active');
                setTimeout(() => {
                    randomButton.classList.remove('active');
                }, 200);
            }
        }, 1000); // Check every second if it's time to switch
    }
    
    // Initialize pattern indicator
    updatePatternIndicator();

    // Start animation
    animationFrameId = requestAnimationFrame(animate);
}