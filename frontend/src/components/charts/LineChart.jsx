import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';

// Register required Chart.js components
ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);

const LineChart = ({ data, options = {}, width = 400, height = 400 }) => {
  const chartData = {
    labels: data.labels || [],
    datasets: [
      {
        label: data.label || 'Dataset',
        data: data.data || [],
        fill: false,
        borderColor: data.borderColor || 'rgba(75, 192, 192, 1)',
        backgroundColor: data.backgroundColor || 'rgba(75, 192, 192, 0.4)',
        tension: 0.1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true
      }
    },
    ...options
  };

  return (
    <div>
      <Line 
        data={chartData} 
        options={chartOptions} 
        width={width} 
        height={height} 
      />
    </div>
  );
};

export default LineChart;