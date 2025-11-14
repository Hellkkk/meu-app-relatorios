import React from 'react';
import { Paper, Typography } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const PurchasesBySupplierChart = ({ data, height = 380 }) => {
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
        Top Fornecedores
      </Typography>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart 
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="fornecedor" 
            angle={-35}
            textAnchor="end"
            height={120}
            tick={{ fontSize: 11 }}
            interval={0}
          />
          <YAxis 
            tickFormatter={formatCurrency}
            tick={{ fontSize: 12 }}
          />
          <Tooltip formatter={(value) => formatCurrency(value)} />
          <Legend wrapperStyle={{ paddingTop: '10px' }} />
          <Bar 
            dataKey="total" 
            fill="#1976d2" 
            name="Valor Total"
            barSize={50}
          />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
};

export default PurchasesBySupplierChart;
