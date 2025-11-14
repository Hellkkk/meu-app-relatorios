import React from 'react';
import { Paper, Typography } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const PurchasesBySupplierChart = ({ data }) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  return (
    <Paper sx={{ p: 3, height: 450 }}>
      <Typography variant="h6" gutterBottom>
        Top Fornecedores
      </Typography>
      <ResponsiveContainer width="100%" height={380}>
        <BarChart 
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="fornecedor" 
            angle={-45}
            textAnchor="end"
            height={100}
            tick={{ fontSize: 12 }}
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
            barSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
};

export default PurchasesBySupplierChart;
