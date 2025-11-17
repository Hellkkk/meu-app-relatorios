import React from 'react';
import { Paper, Typography, Box } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const MonthlyPurchasesChart = ({ data, height = 360, title = 'Evolução Mensal' }) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  // Transform data to add label if not present (use month field)
  const chartData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map(item => ({
      ...item,
      label: item.label || item.month || ''
    }));
  }, [data]);

  const chartHeight = height - 70; // Subtract space for title and padding

  return (
    <Paper sx={{ p: 3, height: height + 70 }} className="chart-card">
      <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem' }}>
        {title}
      </Typography>
      <Box sx={{ 
        width: '100%', 
        height: chartHeight,
        overflow: 'visible'
      }}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <LineChart 
            data={chartData}
            margin={{ top: 10, right: 16, bottom: 26, left: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="label"
              tick={{ fontSize: 10 }}
              angle={-35}
              textAnchor="end"
              height={80}
              minTickGap={24}
            />
            <YAxis 
              tickFormatter={formatCurrency}
              tick={{ fontSize: 10 }}
              width={92}
            />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '0.76rem' }} />
            <Line 
              type="monotone" 
              dataKey="total" 
              stroke="#1976d2" 
              strokeWidth={3}
              name="Valor Total"
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default MonthlyPurchasesChart;
