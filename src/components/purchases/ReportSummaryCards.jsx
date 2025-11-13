import React from 'react';
import { Grid, Card, CardContent, Typography, Box } from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

const ReportSummaryCards = ({ summary }) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const cards = [
    {
      title: 'Total de Compras',
      value: summary?.totalCompras || 0,
      icon: <ShoppingCartIcon sx={{ fontSize: 40 }} />,
      color: '#1976d2'
    },
    {
      title: 'Valor Total',
      value: formatCurrency(summary?.valorTotal),
      icon: <AttachMoneyIcon sx={{ fontSize: 40 }} />,
      color: '#2e7d32'
    },
    {
      title: 'ICMS',
      value: formatCurrency(summary?.totalICMS),
      icon: <AttachMoneyIcon sx={{ fontSize: 40 }} />,
      color: '#ed6c02'
    },
    {
      title: 'IPI',
      value: formatCurrency(summary?.totalIPI),
      icon: <AttachMoneyIcon sx={{ fontSize: 40 }} />,
      color: '#9c27b0'
    },
    {
      title: 'COFINS',
      value: formatCurrency(summary?.totalCOFINS),
      icon: <AttachMoneyIcon sx={{ fontSize: 40 }} />,
      color: '#d32f2f'
    }
  ];

  return (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      {cards.map((card, index) => (
        <Grid item xs={12} sm={6} md={2.4} key={index}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Box sx={{ color: card.color, mr: 1 }}>
                  {card.icon}
                </Box>
              </Box>
              <Typography color="text.secondary" variant="body2" gutterBottom>
                {card.title}
              </Typography>
              <Typography variant="h5" component="div">
                {card.value}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default ReportSummaryCards;
