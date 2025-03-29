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
    if (!isGameActive) {
        resetGame();
    }
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
const SPEED_MULTIPLIER = 2;
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
        const speed = 0.003 + Math.random() * 0.002;
        const radius = RADIUS * (0.3 + Math.random() * 0.5);
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
    if (!gameStatus) {
        gameStarted = false;
        document.getElementById('game-screen').style.display = 'none';
        document.getElementById('start-screen').style.display = 'block';
    }
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

    noisePositions.forEach(pos => {
        const noise = document.createElement('div');
        noise.className = 'noise-circle';
        noise.style.left = `${pos.x - NOISE_SIZE / 2}px`;
        noise.style.top = `${pos.y - NOISE_SIZE / 2}px`;
        gameArea.appendChild(noise);
    });
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