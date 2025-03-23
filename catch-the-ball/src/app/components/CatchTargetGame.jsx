import React, { useState, useCallback } from 'react';

const CatchTargetGame = () => {
  const [ballPosition, setBallPosition] = useState({ x: 50, y: 50 });
  const [targetPosition, setTargetPosition] = useState({ x: 200, y: 200 });
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  
  // Constants for game settings
  const GAME_WIDTH = 600;
  const GAME_HEIGHT = 400;
  const BALL_SIZE = 20;
  const TARGET_SIZE = 24;
  const BALL_FOLLOW_SPEED = 0.15; // Adjust this to change following speed
  const EVASION_SPEED = 1.5;
  
  // Handle all mouse movement
  const handleMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Update ball position with smooth following
    setBallPosition(prev => {
      const dx = mouseX - prev.x;
      const dy = mouseY - prev.y;
      
      return {
        x: prev.x + dx * BALL_FOLLOW_SPEED,
        y: prev.y + dy * BALL_FOLLOW_SPEED
      };
    });
    
    // Update target position (moving away from ball)
    setTargetPosition(prev => {
      const dx = ballPosition.x - prev.x;
      const dy = ballPosition.y - prev.y;
      const angle = Math.atan2(dy, dx);
      
      // Move target away from ball
      let newX = prev.x - Math.cos(angle) * EVASION_SPEED;
      let newY = prev.y - Math.sin(angle) * EVASION_SPEED;
      
      // Keep target within bounds
      newX = Math.max(TARGET_SIZE, Math.min(GAME_WIDTH - TARGET_SIZE, newX));
      newY = Math.max(TARGET_SIZE, Math.min(GAME_HEIGHT - TARGET_SIZE, newY));
      
      // Check for collision
      const distance = Math.sqrt(
        Math.pow(ballPosition.x - newX, 2) + 
        Math.pow(ballPosition.y - newY, 2)
      );
      
      if (distance < (BALL_SIZE + TARGET_SIZE) / 2) {
        setScore(s => s + 1);
        // Move target to random position
        return {
          x: Math.random() * (GAME_WIDTH - TARGET_SIZE * 2) + TARGET_SIZE,
          y: Math.random() * (GAME_HEIGHT - TARGET_SIZE * 2) + TARGET_SIZE
        };
      }
      
      return { x: newX, y: newY };
    });
  }, [ballPosition]);

  return (
    <div className="flex flex-col items-center space-y-4">
      {!gameStarted ? (
        <button
          onClick={() => setGameStarted(true)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Start Game
        </button>
      ) : (
        <>
          <div className="text-xl font-bold">Score: {score}</div>
          <div
            className="relative bg-gray-100 rounded-lg overflow-hidden cursor-none"
            style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
            onMouseMove={handleMouseMove}
          >
            {/* Player's ball */}
            <div
              className="absolute bg-blue-600 rounded-full shadow-lg transition-all duration-75"
              style={{
                width: BALL_SIZE,
                height: BALL_SIZE,
                left: ballPosition.x - BALL_SIZE / 2,
                top: ballPosition.y - BALL_SIZE / 2,
              }}
            />
            
            {/* Target */}
            <div
              className="absolute bg-red-500 rounded-full shadow-lg transition-all duration-75"
              style={{
                width: TARGET_SIZE,
                height: TARGET_SIZE,
                left: targetPosition.x - TARGET_SIZE / 2,
                top: targetPosition.y - TARGET_SIZE / 2
              }}
            />

            {/* Custom cursor */}
            <div
              className="absolute w-4 h-4 border-2 border-blue-600 rounded-full pointer-events-none"
              style={{
                left: ballPosition.x,
                top: ballPosition.y,
                transform: 'translate(-50%, -50%)'
              }}
            />
          </div>
          <div className="text-sm text-gray-600">
            Chase the red target with your cursor!
          </div>
        </>
      )}
    </div>
  );
};

export default CatchTargetGame;