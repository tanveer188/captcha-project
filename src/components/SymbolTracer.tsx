import React, { useEffect, useRef, useState } from 'react';

interface SymbolTracerProps {
  symbol: string;
  width?: number;
  height?: number;
}

const SymbolTracer: React.FC<SymbolTracerProps> = ({ 
  symbol, 
  width = 300, 
  height = 300 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [error, setError] = useState<string>('');

  // Define valid non-overlapping symbols and their path coordinates
  const symbolPaths: { [key: string]: [number, number][] } = {
    '0': [
      [0.5, 0.2], [0.7, 0.3], [0.7, 0.7], [0.5, 0.8],
      [0.3, 0.7], [0.3, 0.3], [0.5, 0.2]
    ],
    '1': [[0.5, 0.2], [0.5, 0.8]],
    '2': [
      [0.3, 0.3], [0.5, 0.2], [0.7, 0.3],
      [0.7, 0.4], [0.3, 0.7], [0.3, 0.8], [0.7, 0.8]
    ],
    '3': [
      [0.3, 0.2], [0.7, 0.2], [0.7, 0.5],
      [0.5, 0.5], [0.7, 0.5], [0.7, 0.8], [0.3, 0.8]
    ],
    'C': [
      [0.7, 0.3], [0.5, 0.2], [0.3, 0.3],
      [0.3, 0.7], [0.5, 0.8], [0.7, 0.7]
    ],
    'L': [[0.3, 0.2], [0.3, 0.8], [0.7, 0.8]],
    'U': [
      [0.3, 0.2], [0.3, 0.7], [0.5, 0.8],
      [0.7, 0.7], [0.7, 0.2]
    ],
    'S': [
      [0.7, 0.3], [0.5, 0.2], [0.3, 0.3],
      [0.3, 0.4], [0.7, 0.6], [0.7, 0.7],
      [0.5, 0.8], [0.3, 0.7]
    ]
  };

  const drawPath = (ctx: CanvasRenderingContext2D, path: [number, number][]) => {
    if (!path.length) return;

    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.strokeStyle = '#2196f3';
    ctx.lineWidth = 3;

    // Draw the complete path
    ctx.moveTo(path[0][0] * width, path[0][1] * height);
    path.forEach(([x, y]) => {
      ctx.lineTo(x * width, y * height);
    });
    ctx.stroke();

    // Draw points at each coordinate
    ctx.fillStyle = '#f44336';
    path.forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x * width, y * height, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  const animatePath = async (ctx: CanvasRenderingContext2D, path: [number, number][]) => {
    if (!path.length) return;

    setIsAnimating(true);
    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.strokeStyle = '#2196f3';
    ctx.lineWidth = 3;

    ctx.moveTo(path[0][0] * width, path[0][1] * height);

    for (let i = 1; i < path.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      ctx.lineTo(path[i][0] * width, path[i][1] * height);
      ctx.stroke();

      // Draw point
      ctx.fillStyle = '#f44336';
      ctx.beginPath();
      ctx.arc(path[i][0] * width, path[i][1] * height, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    setIsAnimating(false);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Validate symbol
    if (!symbolPaths[symbol]) {
      setError('Invalid symbol. Please use non-overlapping symbols (0-9, C, L, U, S)');
      return;
    }
    setError('');

    const path = symbolPaths[symbol];
    drawPath(ctx, path);
  }, [symbol, width, height]);

  const handleCanvasClick = () => {
    const canvas = canvasRef.current;
    if (!canvas || isAnimating) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const path = symbolPaths[symbol];
    if (path) {
      animatePath(ctx, path);
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
          cursor: 'pointer'
        }}
      />
      {error && (
        <div style={{ color: 'red', marginTop: '10px' }}>
          {error}
        </div>
      )}
      <div style={{ marginTop: '10px' }}>
        Click on the canvas to animate the pattern
      </div>
    </div>
  );
};

export default SymbolTracer; 