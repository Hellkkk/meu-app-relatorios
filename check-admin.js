const User = require('./models/User');
const mongoose = require('mongoose');
require('./config/database');

async function checkAdmin() {
  try {
    console.log('🔍 Procurando usuário admin...');
    
    const admin = await User.findOne({email: 'admin@teste.com'});
    
    if (admin) {
      console.log('✅ Usuário admin encontrado!');
      console.log('📧 Email:', admin.email);
      console.log('👤 Nome:', admin.name);
      console.log('🔑 Role:', admin.role);
      console.log('🆔 ID:', admin._id);
    } else {
      console.log('❌ Usuário admin não encontrado!');
      
      // Listar todos os usuários
      const allUsers = await User.find({}, 'email name role');
      console.log('📋 Usuários existentes:');
      allUsers.forEach(user => {
        console.log(`  - ${user.email} (${user.role})`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

// Aguardar conexão com banco
setTimeout(checkAdmin, 2000);