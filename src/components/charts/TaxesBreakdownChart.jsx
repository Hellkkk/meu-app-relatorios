import React from 'react';
import { Paper, Typography, Box } from '@mui/material';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

const TaxesBreakdownChart = ({ data, height = 360 }) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const chartHeight = height - 70; // Subtract space for title and padding

  return (
    <Paper sx={{ p: 3, height: height + 70 }}>
      <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem' }}>
        Composição de Impostos
      </Typography>
      <Box sx={{ 
        width: '100%', 
        height: chartHeight,
        transform: 'scale(0.72)',
        transformOrigin: 'top left',
        overflow: 'visible'
      }}>
        <ResponsiveContainer width="138.89%" height="138.89%">
          <PieChart margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={true}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
              style={{ fontSize: '0.60rem' }}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '0.64rem' }} />
          </PieChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default TaxesBreakdownChart;
