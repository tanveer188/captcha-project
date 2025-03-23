"use client";
import { useState, useCallback, useEffect } from 'react';

export default function Home() {
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [targetPosition, setTargetPosition] = useState({ x: 100, y: 0 });
  const [noisePositions, setNoisePositions] = useState([]);
  const [patternIndex, setPatternIndex] = useState(0);
  const [time, setTime] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameStatus, setGameStatus] = useState(null);
  
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

  // Noise patterns - smaller, faster moving circles
  const generateNoisePatterns = () => {
    return Array(NUM_NOISE_CIRCLES).fill(null).map((_, i) => {
      const speed = 0.003 + Math.random() * 0.002;
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
  };

  const [noisePatterns] = useState(generateNoisePatterns);

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

  // Animation loop
  useEffect(() => {
    if (!gameStarted || gameStatus) return;

    let animationFrameId;
    let lastTime = performance.now();

    const animate = (currentTime) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      setTime(prevTime => {
        const newTime = prevTime + (deltaTime * SPEED_MULTIPLIER);
        if (Math.floor(prevTime / (PATTERN_DURATION * 1000)) !== 
            Math.floor(newTime / (PATTERN_DURATION * 1000))) {
          setPatternIndex(prev => (prev + 1) % patterns.length);
        }
        return newTime;
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameStarted, gameStatus]);

  // Update target and noise positions
  useEffect(() => {
    if (!gameStarted || gameStatus) return;
    setTargetPosition(patterns[patternIndex](time));
    setNoisePositions(noisePatterns.map(pattern => pattern(time)));
  }, [time, patternIndex, gameStarted, gameStatus, noisePatterns]);

  const handleClick = () => {
    if (!gameStarted || gameStatus) return;
    
    if (patternIndex === FIGURE_8_PATTERN_INDEX) {
      setGameStatus('won');
    } else {
      setGameStatus('lost');
    }
  };

  const handleMouseMove = useCallback((e) => {
    if (!gameStarted || gameStatus) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setCursorPosition({ x: mouseX, y: mouseY });
  }, [gameStarted, gameStatus]);

  const patternNames = [
    "Circle",
    "Square",
    "✨ Figure-8 ✨",
    "Triangle",
    "Zigzag"
  ];

  const resetGame = () => {
    setGameStarted(true);
    setGameStatus(null);
    setTime(0);
    setPatternIndex(0);
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center">
        <div className="flex flex-col items-center gap-4">
          {!gameStarted ? (
            <div className="flex flex-col items-center gap-4">
              <p className="text-center text-gray-600 dark:text-gray-400 max-w-md">
                Click when you see the "Figure-8" pattern to win! 
                Click during any other pattern and you lose.
              </p>
              <button
                onClick={resetGame}
                className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
              >
                Start Game
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center gap-2">
                {gameStatus ? (
                  <div className={`text-2xl font-bold ${gameStatus === 'won' ? 'text-green-500' : 'text-red-500'}`}>
                    {gameStatus === 'won' ? 'You Won! 🎉' : 'Game Over! 😢'}
                    <button
                      onClick={resetGame}
                      className="block mt-4 px-4 py-2 bg-blue-500 text-white rounded-full text-sm hover:bg-blue-600 transition-colors"
                    >
                      Play Again
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Pattern changes in: {PATTERN_DURATION - Math.floor((time / 1000) % PATTERN_DURATION)}s
                  </div>
                )}
              </div>
              <div
                className="relative cursor-none"
                style={{ 
                  width: RADIUS * 2, 
                  height: RADIUS * 2,
                }}
                onClick={handleClick}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => !gameStatus && setGameStarted(false)}
              >
                <div 
                  className={`absolute inset-0 rounded-full transition-colors duration-300
                    ${gameStatus === 'won' ? 'bg-green-100 dark:bg-green-900/20' :
                      gameStatus === 'lost' ? 'bg-red-100 dark:bg-red-900/20' :
                      'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20'}`}
                  style={{
                    width: RADIUS * 2,
                    height: RADIUS * 2,
                  }}
                />

                {/* Noise circles */}
                {!gameStatus && noisePositions.map((pos, i) => (
                  <div
                    key={i}
                    className="absolute bg-gray-400/30 rounded-full"
                    style={{
                      width: NOISE_SIZE,
                      height: NOISE_SIZE,
                      left: pos.x - NOISE_SIZE / 2,
                      top: pos.y - NOISE_SIZE / 2,
                      transition: 'none'
                    }}
                  />
                ))}

                {/* Player's cursor/ball */}
                {!gameStatus && (
                  <div
                    className="absolute bg-blue-500 rounded-full shadow-lg"
                    style={{
                      width: BALL_SIZE,
                      height: BALL_SIZE,
                      left: cursorPosition.x - BALL_SIZE / 2,
                      top: cursorPosition.y - BALL_SIZE / 2,
                      boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)',
                      transition: 'none'
                    }}
                  />
                )}
                
                {/* Target */}
                {!gameStatus && (
                  <div
                    className={`absolute rounded-full shadow-lg
                      ${patternIndex === FIGURE_8_PATTERN_INDEX ? 
                        'bg-yellow-400 animate-pulse' : 'bg-red-400'}`}
                    style={{
                      width: TARGET_SIZE,
                      height: TARGET_SIZE,
                      left: targetPosition.x - TARGET_SIZE / 2,
                      top: targetPosition.y - TARGET_SIZE / 2,
                      boxShadow: patternIndex === FIGURE_8_PATTERN_INDEX ?
                        '0 0 20px rgba(250, 204, 21, 0.7)' :
                        '0 0 15px rgba(239, 68, 68, 0.5)',
                      transition: 'none'
                    }}
                  />
                )}
              </div>
              {!gameStatus && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Click when you see the Figure-8 pattern!
                </p>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}