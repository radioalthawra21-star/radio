import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const BarChart = ({ data, options = {}, width = 400, height = 400 }) => {
  const chartData = {
    labels: data.labels || [],
    datasets: (data.datasets || []).map(ds => ({
      ...ds,
      backgroundColor: ds.backgroundColor || 'rgba(205, 111, 19, 0.6)',
      borderColor: ds.borderColor || 'rgba(205, 111, 19, 1)',
      borderWidth: ds.borderWidth || 1,
    })),
  };

  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { display: true, position: 'bottom', rtl: true, labels: { font: { family: 'system-ui' } } } },
    scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } },
  };

  return <Bar data={chartData} options={{ ...defaultOptions, ...options }} />;
};

export default BarChart;
