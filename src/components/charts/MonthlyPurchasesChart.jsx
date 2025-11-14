import React from 'react';
import { Paper, Typography } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const MonthlyPurchasesChart = ({ data }) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  return (
    <Paper sx={{ p: 3, height: 450 }}>
      <Typography variant="h6" gutterBottom>
        Evolução Mensal
      </Typography>
      <ResponsiveContainer width="100%" height={380}>
        <LineChart 
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="label"
            tick={{ fontSize: 12 }}
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
