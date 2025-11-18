import React from 'react';
import { Paper, Typography, Box } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Custom tick component for truncated labels with full text in title
const CustomTick = ({ x, y, payload }) => {
  const maxLength = 14;
  const fullText = payload.value || '';
  const displayText = fullText.length > maxLength 
    ? fullText.substring(0, maxLength) + '...' 
    : fullText;

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={8}
        textAnchor="end"
        fill="#666"
        transform="rotate(-35)"
        style={{ fontSize: '10px' }}
      >
        <title>{fullText}</title>
        {displayText}
      </text>
    </g>
  );
};

const PurchasesBySupplierChart = ({ data, height = 360 }) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  // Limit to top 5 suppliers by total value
  const top5Data = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    return [...data]
      .sort((a, b) => (b.total || 0) - (a.total || 0))
      .slice(0, 5);
  }, [data]);

  // Custom tooltip to show full supplier name
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: 1,
            padding: 1,
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
            {payload[0].payload.fornecedor}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
            Valor Total: {formatCurrency(payload[0].value)}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  const chartHeight = height - 70; // Subtract space for title and padding

  return (
    <Paper sx={{ p: 3, height: height + 70 }} className="chart-card">
      <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem' }}>
        Top Fornecedores
      </Typography>
      <Box sx={{ 
        width: '100%', 
        height: chartHeight,
        overflow: 'visible'
      }}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart 
            data={top5Data}
            margin={{ top: 10, right: 12, bottom: 56, left: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="fornecedor" 
              height={120}
              tick={<CustomTick />}
              interval={0}
            />
            <YAxis 
              tickFormatter={formatCurrency}
              tick={{ fontSize: 10 }}
              width={92}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '0.76rem' }} />
            <Bar 
              dataKey="total" 
              fill="#1976d2" 
              name="Valor Total"
              barSize={18}
            />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default PurchasesBySupplierChart;
