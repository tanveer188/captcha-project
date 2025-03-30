const API_URL = 'http://localhost:5000/api/captcha';
let captchaToken = null;
let messageElement = null;

let canvas, ctx, chars = [], charPositions = [];
let captchaText = '';
let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
let symbols = '!@#$%^&*+=<>?[]{}';
let letterSize = 36;  // Fixed size for letters
let symbolSize = 40;  // Fixed size for symbols
let allCharacters = characters + symbols;
let animationId;
let unblurredIndex = -1;
let unblurTimer = null;
let enteredSequence = [];
let successCount = 0;
let failCount = 0;
let difficulty = 1;
let timeLeft = 20;
let timerInterval = null;

function resizeCanvas() {
    const container = canvas.parentElement;
    const containerWidth = container.clientWidth;
    const maxWidth = 400;
    const maxHeight = 300;
    
    // Calculate new dimensions maintaining aspect ratio
    let newWidth = Math.min(containerWidth - 40, maxWidth);
    let newHeight = (newWidth * maxHeight) / maxWidth;
    
    // Update canvas size
    canvas.width = newWidth;
    canvas.height = newHeight;
    
    // Adjust letter sizes based on canvas size
    letterSize = Math.max(24, Math.floor(newWidth / 12));
    symbolSize = letterSize + 4;
    
    // Regenerate CAPTCHA if it exists
    if (chars.length > 0) {
        generateCaptcha();
    }
}

// Add debounce utility function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize canvas when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }
    ctx = canvas.getContext('2d');
    
    // Initial resize
    resizeCanvas();
    
    // Add resize event listener
    window.addEventListener('resize', debounce(resizeCanvas, 250));
    
    generateCaptcha();
});

function updateStats(success) {
    if (success) {
        successCount++;
        document.getElementById('success-count').textContent = successCount;
        // Increase difficulty every 3 successful attempts
        if (successCount % 3 === 0) {
            difficulty = Math.min(difficulty + 1, 3);
        }
    } else {
        failCount++;
        document.getElementById('fail-count').textContent = failCount;
    }
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timeLeft = 20; // Changed from 10 to 20 seconds
    updateTimerDisplay();
    
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            handleTimeout();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const timerElement = document.getElementById('timer');
    timerElement.textContent = `Time: ${timeLeft}s`;
    // Update warning threshold to 5 seconds
    timerElement.className = timeLeft <= 5 ? 'timer warning' : 'timer';
}

function handleTimeout() {
    const result = document.getElementById('result');
    result.textContent = 'Time\'s up! Try again.';
    result.className = 'error';
    updateStats(false);
    showTryAgainButton();
}

function showTryAgainButton() {
    document.getElementById('tryAgainBtn').style.display = 'block';
    document.getElementById('captcha-input').disabled = true;
}

function hideTryAgainButton() {
    document.getElementById('tryAgainBtn').style.display = 'none';
    document.getElementById('captcha-input').disabled = false;
}

function resetGame() {
    enteredSequence = [];
    document.getElementById('sequence').textContent = '';
    document.getElementById('captcha-input').value = '';
    hideTryAgainButton();
    generateCaptcha();
}

function restartGame() {
    // Cancel all animations and timers first
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    if (unblurTimer) {
        clearTimeout(unblurTimer);
        unblurTimer = null;
    }

    // Reset game state
    successCount = 0;
    failCount = 0;
    difficulty = 1;
    timeLeft = 20;
    chars = [];
    charPositions = [];
    enteredSequence = [];
    captchaText = '';
    unblurredIndex = -1;
    
    // Reset UI elements
    const elements = {
        'success-count': '0',
        'fail-count': '0',
        'sequence': '',
        'result': '',
        'timer': 'Time: 20s',
        'captcha-input': ''
    };

    for (const [id, value] of Object.entries(elements)) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            if (id === 'captcha-input') element.value = value;
            if (id === 'result') element.className = '';
        }
    }

    // Re-enable input and hide try again button
    const input = document.getElementById('captcha-input');
    if (input) {
        input.disabled = false;
    }
    const tryAgainBtn = document.getElementById('tryAgainBtn');
    if (tryAgainBtn) {
        tryAgainBtn.style.display = 'none';
    }

    // Clear canvas
    if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Start fresh game
    setTimeout(() => {
        generateCaptcha();
    }, 100);
}

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
        showError(`Error: ${error.message}`);
        return null;
    }
}

function showError(message) {
    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.className = 'error-message';
        document.querySelector('.game-container').appendChild(messageElement);
    }
    messageElement.textContent = message;
    messageElement.style.color = '#ff4444';
}

async function generateCaptcha() {
    if (!ctx) return;
    
    try {
        const initData = await initializeCaptcha();
        if (!initData) return;
        
        chars = [];
        charPositions = [];
        enteredSequence = [];
        
        const totalChars = 10;
        const requiredChars = 4;
        
        // Generate solution characters (only letters)
        const solutionChars = Array.from({length: requiredChars}, () => ({
            char: characters.charAt(Math.floor(Math.random() * characters.length)),
            isBlurred: true,
            hasBeenUnblurred: false,
            isRequired: true,
            isSymbol: false,
            opacity: 1,
            size: letterSize  // Use fixed letter size
        }));
        
        // Generate decoy characters
        const decoyChars = Array.from({length: totalChars - requiredChars}, () => {
            const useSymbol = Math.random() < 0.6; // Increased symbol probability
            return {
                char: useSymbol ? 
                    symbols.charAt(Math.floor(Math.random() * symbols.length)) :
                    characters.charAt(Math.floor(Math.random() * characters.length)),
                isBlurred: true,
                hasBeenUnblurred: false,
                isRequired: false,
                isSymbol: useSymbol,
                opacity: useSymbol ? 0.8 : 0.6, // Increased symbol opacity
                size: useSymbol ? symbolSize : letterSize  // Use fixed sizes
            };
        });
        
        // Combine and shuffle characters
        chars = [...solutionChars, ...decoyChars].sort(() => Math.random() - 0.5);
        captchaText = initData.solution || solutionChars.map(c => c.char).join('');
        
        // Generate positions with varying speeds
        chars.forEach((char) => {
            const baseSpeed = 2 + difficulty;
            const speed = char.isSymbol ? baseSpeed * 1.2 : baseSpeed;
            
            charPositions.push({
                x: Math.random() * (canvas.width - 100) + 50,
                y: Math.random() * (canvas.height - 100) + 50,
                dx: (Math.random() - 0.5) * speed,
                dy: (Math.random() - 0.5) * speed,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: char.isSymbol ? 0.04 : 0.02
            });
        });
        
        startAnimation();
        startUnblurSequence();
        startTimer();
    } catch (error) {
        showError(`Error: ${error.message}`);
    }
}

function startUnblurSequence() {
    if (unblurTimer) clearTimeout(unblurTimer);
       
    function unblurNext() {

        const nextIndex = chars.findIndex(c => !c.hasBeenUnblurred);
        if (nextIndex === -1) return;

        unblurredIndex = nextIndex;
        chars[nextIndex].isBlurred = false;
        chars[nextIndex].hasBeenUnblurred = true;

        const blurDuration = Math.max(3000 - (difficulty * 500), 1000);
        unblurTimer = setTimeout(() => {
            chars[nextIndex].isBlurred = true;
            unblurredIndex = -1;
        }, blurDuration);

   
        unblurTimer = setTimeout(unblurNext, Math.random() * 2000 + 1000);
    }

    unblurTimer = setTimeout(unblurNext, 1000);
}

function startAnimation() {
    if (animationId) cancelAnimationFrame(animationId);
    animate();
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    chars.forEach((charObj, index) => {
        let pos = charPositions[index];
   
        if (pos.y < 30 || pos.y > canvas.height - 30) {
            pos.dy *= charObj.isSymbol ? -0.9 : -1;
            pos.y = pos.y < 30 ? 30 : canvas.height - 30;
        }
        if (pos.x < 30 || pos.x > canvas.width - 30) {
            pos.dx *= charObj.isSymbol ? -0.9 : -1;
            pos.x = pos.x < 30 ? 30 : canvas.width - 30;
        }

    
        pos.y += pos.dy;
        pos.x += pos.dx;
        pos.rotation += pos.rotationSpeed;

        ctx.save();
        ctx.font = `${charObj.isSymbol ? 'normal' : 'bold'} ${charObj.size}px Arial`;
        ctx.fillStyle = `rgba(0, 0, 0, ${charObj.opacity})`;
        
        ctx.translate(pos.x, pos.y);
        ctx.rotate(pos.rotation);
        
        if (charObj.isBlurred) {
            ctx.filter = `blur(${charObj.isSymbol ? 4 : 6}px)`; // Reduced blur for symbols
        } else {
            ctx.filter = 'none';
            if (charObj.isRequired) {
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowBlur = 10;
                ctx.fillStyle = '#000000';
            }
        }
        
        // Adjust position based on character type
        const offset = charObj.isSymbol ? -charObj.size/2 : -12;
        ctx.fillText(charObj.char, offset, offset);
        ctx.restore();
    });

    animationId = requestAnimationFrame(animate);
}

async function validateCaptcha() {
    const input = document.getElementById('captcha-input').value.toUpperCase();
    const result = document.getElementById('result');
    
    if (input) {
        enteredSequence.push(input);
        document.getElementById('sequence').textContent = 
            `Entered: ${enteredSequence.join(' ')} (${enteredSequence.length}/4)`;
        document.getElementById('captcha-input').value = '';
    }

 
    if (enteredSequence.length === 4) {
        clearInterval(timerInterval);
        const enteredText = enteredSequence.join('');
        
        try {
            const response = await fetch(`${API_URL}/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token: captchaToken,
                    solution: enteredText
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Verification failed');
            }

            if (data.success) {
                result.textContent = 'CAPTCHA verified successfully!';
                result.className = 'success';
                updateStats(true);
            } else {
                result.textContent = 'CAPTCHA verification failed. Try again.';
                result.className = 'error';
                updateStats(false);
                showTryAgainButton();
                return;
            }
        } catch (error) {
            showError(`Error: ${error.message}`);
            return;
        }
        
        resetGame();
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const input = document.getElementById('captcha-input');
    if (input) {
        input.addEventListener('keypress', function(e) {
            if (e.key !== 'Enter' && !/^[A-Za-z]$/.test(e.key)) {
                e.preventDefault();
                return false;
            }
            if (e.key === 'Enter') {
                validateCaptcha();
            }
        });
    }
});
