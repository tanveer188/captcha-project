import React, { useEffect, useRef, useState } from 'react';

const SymbolTracer = ({ symbol = '', width = 300, height = 300 }) => {
  const canvasRef = useRef(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [error, setError] = useState('');

  // Helper function to generate circle points
  const generateCirclePoints = (centerX, centerY, radius, points = 24) => {
    const result = [];
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * 2 * Math.PI;
      result.push([
        centerX + radius * Math.cos(angle),
        centerY + radius * Math.sin(angle)
      ]);
    }
    return result;
  };

  // Helper function to generate ellipse points
  const generateEllipsePoints = (centerX, centerY, radiusX, radiusY, points = 24) => {
    const result = [];
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * 2 * Math.PI;
      result.push([
        centerX + radiusX * Math.cos(angle),
        centerY + radiusY * Math.sin(angle)
      ]);
    }
    return result;
  };

  // Define symbol paths with smoother curves
  const symbolPaths = {
    // Basic shapes
    'O': generateCirclePoints(0.5, 0.5, 0.25),
    'E': generateEllipsePoints(0.5, 0.5, 0.3, 0.2),
    'S': [
      [0.7, 0.3], [0.65, 0.25], [0.6, 0.2], [0.5, 0.2], [0.4, 0.2],
      [0.3, 0.25], [0.3, 0.35], [0.35, 0.4], [0.45, 0.45], [0.55, 0.5],
      [0.65, 0.55], [0.7, 0.6], [0.7, 0.7], [0.65, 0.75], [0.55, 0.8],
      [0.45, 0.8], [0.35, 0.8], [0.3, 0.75], [0.3, 0.7]
    ],
    'R': [ // Rectangle
      [0.3, 0.3], [0.7, 0.3], [0.7, 0.7], [0.3, 0.7], [0.3, 0.3]
    ],
    'D': [ // Diamond/Rhombus
      [0.5, 0.2], [0.7, 0.5], [0.5, 0.8], [0.3, 0.5], [0.5, 0.2]
    ],
    'T': [ // Triangle
      [0.5, 0.2], [0.7, 0.7], [0.3, 0.7], [0.5, 0.2]
    ],
    'H': [ // Hexagon
      [0.5, 0.2], [0.7, 0.35], [0.7, 0.65], [0.5, 0.8],
      [0.3, 0.65], [0.3, 0.35], [0.5, 0.2]
    ],
    // Special shapes
    'V': [ // Heart
      [0.5, 0.3], // Start at top center
      [0.6, 0.2], [0.7, 0.2], [0.7, 0.3], // Right curve top
      [0.7, 0.4], [0.5, 0.8], // Right curve to bottom
      [0.3, 0.4], [0.3, 0.3], // Left curve to bottom
      [0.3, 0.2], [0.4, 0.2], [0.5, 0.3] // Left curve top
    ],
    'A': [ // Arrow pointing right
      [0.2, 0.5], // Start at left
      [0.7, 0.5], // Horizontal line
      [0.6, 0.3], // Arrow top
      [0.7, 0.5], // Back to center
      [0.6, 0.7]  // Arrow bottom
    ],
    'U': [ // Arrow pointing up
      [0.5, 0.8], // Start at bottom
      [0.5, 0.3], // Vertical line
      [0.3, 0.4], // Left arrow
      [0.5, 0.3], // Back to top
      [0.7, 0.4]  // Right arrow
    ],
    // Numbers with natural writing patterns
    '0': generateEllipsePoints(0.5, 0.5, 0.2, 0.3),
    '1': [
      [0.4, 0.3], // Start slightly left for the serif
      [0.5, 0.2], // Top
      [0.5, 0.8], // Vertical line down
      [0.4, 0.8], [0.6, 0.8] // Base
    ],
    '2': [
      [0.3, 0.3], // Start
      [0.4, 0.2], [0.5, 0.2], [0.6, 0.2], // Top curve
      [0.7, 0.3], [0.7, 0.4], // Right curve
      [0.6, 0.5], [0.5, 0.6], // Middle
      [0.4, 0.7], [0.3, 0.8], // Bottom curve
      [0.4, 0.8], [0.5, 0.8], [0.6, 0.8], [0.7, 0.8] // Base line
    ],
    '3': [
      [0.3, 0.3], // Start
      [0.4, 0.2], [0.5, 0.2], [0.6, 0.2], // Top curve
      [0.7, 0.3], [0.7, 0.4], // Upper right curve
      [0.6, 0.5], [0.5, 0.5], // Middle
      [0.6, 0.5], [0.7, 0.6], // Lower right curve
      [0.7, 0.7], [0.6, 0.8], [0.5, 0.8], [0.4, 0.8], [0.3, 0.7] // Bottom curve
    ],
    '4': [
      [0.3, 0.2], // Start from top-left
      [0.3, 0.5], // Vertical line down to middle
      [0.3, 0.5], // Ensure clean connection
      [0.7, 0.5], // Horizontal line to right
      [0.5, 0.2], // Move to top of vertical line
      [0.5, 0.8]  // Draw main vertical line down
    ],
    '5': [
      [0.7, 0.2], [0.3, 0.2], // Top horizontal
      [0.3, 0.2], [0.3, 0.4], // Left vertical
      [0.3, 0.4], [0.4, 0.4], [0.5, 0.4], [0.6, 0.4], // Middle horizontal
      [0.7, 0.5], [0.7, 0.7], // Right curve
      [0.6, 0.8], [0.5, 0.8], [0.4, 0.8], [0.3, 0.7] // Bottom curve
    ],
    '6': [
      [0.7, 0.3], [0.6, 0.2], [0.5, 0.2], [0.4, 0.2], // Top curve
      [0.3, 0.3], [0.3, 0.5], // Left curve down
      [0.3, 0.7], // Continue down
      [0.4, 0.8], [0.5, 0.8], [0.6, 0.8], // Bottom curve
      [0.7, 0.7], [0.7, 0.6], // Right curve
      [0.6, 0.5], [0.5, 0.5], [0.4, 0.5], [0.3, 0.5] // Connect to center
    ],
    '7': [
      [0.3, 0.2], // Start top left
      [0.7, 0.2], // Top horizontal
      [0.5, 0.5], // Middle diagonal
      [0.4, 0.8]  // Bottom
    ],
    '8': [
      // Start from top-center, draw in one continuous motion
      [0.5, 0.2], // Top center
      [0.65, 0.2], // Top right curve
      [0.7, 0.3],
      [0.65, 0.4],
      [0.5, 0.4], // Middle right
      [0.35, 0.4],
      [0.3, 0.3],
      [0.35, 0.2],
      [0.5, 0.2], // Back to top center
      [0.5, 0.4], // Down to middle
      [0.5, 0.6], // Continue to bottom half
      [0.35, 0.6],
      [0.3, 0.7],
      [0.35, 0.8],
      [0.5, 0.8], // Bottom center
      [0.65, 0.8],
      [0.7, 0.7],
      [0.65, 0.6],
      [0.5, 0.6]  // Complete the figure
    ],
    '9': [
      [0.3, 0.7], [0.4, 0.8], [0.5, 0.8], [0.6, 0.8], // Bottom curve
      [0.7, 0.7], [0.7, 0.5], // Right curve up
      [0.7, 0.3], // Continue up
      [0.6, 0.2], [0.5, 0.2], [0.4, 0.2], // Top curve
      [0.3, 0.3], [0.3, 0.4], // Left curve
      [0.4, 0.5], [0.5, 0.5], [0.6, 0.5], [0.7, 0.5] // Connect to center
    ]
  };

  // Function to interpolate points for smooth animation
  const interpolatePoints = (start, end, steps = 15) => {
    const points = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Use sinusoidal easing for more natural circular motion
      const ease = 0.5 - Math.cos(t * Math.PI) / 2;
      points.push([
        start[0] + (end[0] - start[0]) * ease,
        start[1] + (end[1] - start[1]) * ease
      ]);
    }
    return points;
  };

  const clearCanvas = (ctx) => {
    ctx.clearRect(0, 0, width, height);
    
    // Draw grid for reference
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    
    // Draw vertical lines
    for (let i = 0; i <= width; i += 30) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let i = 0; i <= height; i += 30) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }
  };

  const drawCursor = (ctx, x, y) => {
    // Draw cursor (red dot with white border)
    ctx.beginPath();
    ctx.arc(x * width, y * height, 6, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.strokeStyle = '#f44336';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x * width, y * height, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#f44336';
    ctx.fill();
  };

  const animatePath = async (ctx, path) => {
    if (!path.length) return;

    setIsAnimating(true);
    clearCanvas(ctx);

    // Start with the cursor at the first point
    drawCursor(ctx, path[0][0], path[0][1]);
    
    for (let i = 1; i < path.length; i++) {
      const interpolated = interpolatePoints(path[i-1], path[i]);
      
      for (const point of interpolated) {
        await new Promise(resolve => setTimeout(resolve, 8)); // Faster animation (~120fps)
        clearCanvas(ctx);
        drawCursor(ctx, point[0], point[1]);
      }
    }

    setIsAnimating(false);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    clearCanvas(ctx);

    // If there's a symbol, show its starting point
    if (symbol && symbolPaths[symbol.toUpperCase()]) {
      const path = symbolPaths[symbol.toUpperCase()];
      drawCursor(ctx, path[0][0], path[0][1]);
    }

  }, [width, height, symbol]);

  const handleCanvasClick = () => {
    if (isAnimating) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (symbol && symbolPaths[symbol.toUpperCase()]) {
      animatePath(ctx, symbolPaths[symbol.toUpperCase()]);
    }
  };

  return (
    <div className="symbol-tracer">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleCanvasClick}
        style={{ 
          border: '1px solid #ccc',
          cursor: 'pointer',
          touchAction: 'none',
          backgroundColor: 'white'
        }}
      />
      {error && (
        <div style={{ color: 'red', marginTop: '10px' }}>
          {error}
        </div>
      )}
      <div style={{ marginTop: '10px' }}>
        Click on the canvas to see the cursor movement!
      </div>
    </div>
  );
};

export default SymbolTracer; 