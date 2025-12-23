import React, { useEffect, useRef } from 'react';

interface ProgressChartProps {
  data: {
    balance: number;
    timestamp: Date;
  }[];
  width?: number;
  height?: number;
}

export default function ProgressChart({ data, width = 600, height = 300 }: ProgressChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Find min and max values
    const balances = data.map(d => d.balance);
    const minBalance = Math.min(...balances);
    const maxBalance = Math.max(...balances);
    const range = maxBalance - minBalance;

    // Set up scaling
    const padding = 40;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    // Draw grid with space theme
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.lineWidth = 1;
    
    // Vertical grid lines
    for (let i = 0; i <= 5; i++) {
      const x = padding + (i * chartWidth) / 5;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = padding + (i * chartHeight) / 4;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Draw balance line with gradient
    if (data.length > 1) {
      // Create gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#06b6d4'); // cyan
      gradient.addColorStop(0.5, '#3b82f6'); // blue
      gradient.addColorStop(1, '#8b5cf6'); // purple
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();

      data.forEach((point, index) => {
        const x = padding + (index * chartWidth) / (data.length - 1);
        const y = height - padding - ((point.balance - minBalance) / range) * chartHeight;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // Draw area under line with gradient
      const areaGradient = ctx.createLinearGradient(0, 0, 0, height);
      areaGradient.addColorStop(0, 'rgba(6, 182, 212, 0.3)'); // cyan
      areaGradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.2)'); // blue
      areaGradient.addColorStop(1, 'rgba(139, 92, 246, 0.1)'); // purple
      
      ctx.fillStyle = areaGradient;
      ctx.beginPath();
      ctx.moveTo(padding, height - padding);
      
      data.forEach((point, index) => {
        const x = padding + (index * chartWidth) / (data.length - 1);
        const y = height - padding - ((point.balance - minBalance) / range) * chartHeight;
        ctx.lineTo(x, y);
      });
      
      ctx.lineTo(width - padding, height - padding);
      ctx.closePath();
      ctx.fill();

      // Draw data points with glow effect
      data.forEach((point, index) => {
        const x = padding + (index * chartWidth) / (data.length - 1);
        const y = height - padding - ((point.balance - minBalance) / range) * chartHeight;
        
        // Glow effect
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#06b6d4';
        
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
        ctx.fill();
        
        // Inner point
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
      });
    }

    // Draw labels
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';

    // Y-axis labels
    for (let i = 0; i <= 4; i++) {
      const value = minBalance + (i * range) / 4;
      const y = padding + (i * chartHeight) / 4;
      ctx.fillText(`$${value.toFixed(0)}`, padding - 10, y + 4);
    }

    // X-axis labels (time)
    if (data.length > 0) {
      const firstTime = new Date(data[0].timestamp);
      const lastTime = new Date(data[data.length - 1].timestamp);
      
      for (let i = 0; i <= 5; i++) {
        const x = padding + (i * chartWidth) / 5;
        const time = new Date(firstTime.getTime() + (i * (lastTime.getTime() - firstTime.getTime())) / 5);
        ctx.fillText(time.toLocaleTimeString(), x, height - padding + 20);
      }
    }

  }, [data, width, height]);

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          📈 Portfolio Performance
        </h3>
        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-600 rounded-lg flex items-center justify-center">
          <span className="text-white text-sm">🚀</span>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full h-auto rounded-2xl"
      />
      <div className="mt-6 flex justify-between text-sm">
        <div className="bg-slate-800/50 rounded-xl px-4 py-2 border border-slate-700/30">
          <span className="text-slate-300 font-medium">Starting: </span>
          <span className="text-cyan-400 font-bold">${data[0]?.balance.toFixed(2) || '0.00'}</span>
        </div>
        <div className="bg-slate-800/50 rounded-xl px-4 py-2 border border-slate-700/30">
          <span className="text-slate-300 font-medium">Current: </span>
          <span className="text-blue-400 font-bold">${data[data.length - 1]?.balance.toFixed(2) || '0.00'}</span>
        </div>
        <div className="bg-slate-800/50 rounded-xl px-4 py-2 border border-slate-700/30">
          <span className="text-slate-300 font-medium">Change: </span>
          <span className={`font-bold ${data.length > 1 && ((data[data.length - 1].balance - data[0].balance) / data[0].balance * 100) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {data.length > 1 ? 
              `${((data[data.length - 1].balance - data[0].balance) / data[0].balance * 100).toFixed(2)}%` : 
              '0.00%'
            }
          </span>
        </div>
      </div>
    </div>
  );
} 