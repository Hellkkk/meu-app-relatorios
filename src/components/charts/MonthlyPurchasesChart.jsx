import React from 'react';
import { Paper, Typography } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const MonthlyPurchasesChart = ({ data, height = 380 }) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const chartHeight = height - 70; // Subtract space for title and padding

  return (
    <Paper sx={{ p: 3, height: height + 70 }}>
      <Typography variant="h6" gutterBottom>
        Evolução Mensal
      </Typography>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <LineChart 
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="label"
            tick={{ fontSize: 11 }}
            angle={-35}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            tickFormatter={formatCurrency}
            tick={{ fontSize: 12 }}
          />
          <Tooltip formatter={(value) => formatCurrency(value)} />
          <Legend wrapperStyle={{ paddingTop: '10px' }} />
          <Line 
            type="monotone" 
            dataKey="total" 
            stroke="#1976d2" 
            strokeWidth={3}
            name="Valor Total"
            dot={{ r: 5 }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Paper>
  );
};

export default MonthlyPurchasesChart;
