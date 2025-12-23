import React, { memo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartData
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { format } from 'date-fns';
import type { PerformanceMetrics } from '../types';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface MetricCardProps {
  title: string;
  value: string | number;
  trend: 'up' | 'down' | 'neutral';
  change?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, trend, change }) => {
  return (
    <div className="bg-gray-700 rounded-lg p-4">
      <h4 className="text-gray-400 text-sm">{title}</h4>
      <div className="flex items-center justify-between mt-2">
        <span className="text-2xl font-bold text-white">{value}</span>
        {change && (
          <span className={`text-sm ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
            {trend === 'up' ? '↑' : '↓'} {change}
          </span>
        )}
      </div>
    </div>
  );
};

interface AnalyticsProps {
  performanceData: PerformanceMetrics;
  isLoading?: boolean;
  error?: string | null;
}

export const Analytics = memo(function Analytics({ 
  performanceData, 
  isLoading = false, 
  error = null 
}: AnalyticsProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-800 rounded-lg">
        <div className="text-white">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-800 rounded-lg">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  // Ensure we have data to display
  if (!performanceData.timestamps.length) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-800 rounded-lg">
        <div className="text-gray-400">No trading data available yet</div>
      </div>
    );
  }

  const profitChartData: ChartData<'line'> = {
    labels: performanceData.timestamps.map(t => format(new Date(t), 'MMM dd HH:mm')),
    datasets: [
      {
        label: 'Cumulative Profit/Loss ($)',
        data: performanceData.profits,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
        fill: false,
      },
    ],
  };

  const tradesChartData: ChartData<'bar'> = {
    labels: performanceData.timestamps.map(t => format(new Date(t), 'MMM dd')),
    datasets: [
      {
        label: 'Number of Trades',
        data: performanceData.trades,
        backgroundColor: 'rgb(54, 162, 235)',
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Win Rate"
          value={`${(performanceData.winRate * 100).toFixed(2)}%`}
          trend={performanceData.winRate >= 0.5 ? 'up' : 'down'}
        />
        <MetricCard
          title="Sharpe Ratio"
          value={performanceData.sharpeRatio.toFixed(2)}
          trend={performanceData.sharpeRatio >= 1 ? 'up' : 'down'}
        />
        <MetricCard
          title="Max Drawdown"
          value={`${performanceData.maxDrawdown.toFixed(2)}%`}
          trend="down"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-4">Profit/Loss History</h3>
          <Line 
            data={profitChartData}
            options={{
              responsive: true,
              scales: {
                y: {
                  beginAtZero: true,
                  grid: {
                    color: 'rgba(255, 255, 255, 0.1)',
                  },
                  ticks: {
                    color: 'rgba(255, 255, 255, 0.8)',
                  },
                },
                x: {
                  grid: {
                    color: 'rgba(255, 255, 255, 0.1)',
                  },
                  ticks: {
                    color: 'rgba(255, 255, 255, 0.8)',
                  },
                },
              },
              plugins: {
                legend: {
                  labels: {
                    color: 'rgba(255, 255, 255, 0.8)',
                  },
                },
              },
            }}
          />
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-4">Daily Trading Volume</h3>
          <Bar 
            data={tradesChartData}
            options={{
              responsive: true,
              scales: {
                y: {
                  beginAtZero: true,
                  grid: {
                    color: 'rgba(255, 255, 255, 0.1)',
                  },
                  ticks: {
                    color: 'rgba(255, 255, 255, 0.8)',
                  },
                },
                x: {
                  grid: {
                    color: 'rgba(255, 255, 255, 0.1)',
                  },
                  ticks: {
                    color: 'rgba(255, 255, 255, 0.8)',
                  },
                },
              },
              plugins: {
                legend: {
                  labels: {
                    color: 'rgba(255, 255, 255, 0.8)',
                  },
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}); 