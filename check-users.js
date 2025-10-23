require('dotenv').config();
const User = require('./models/User');
require('./config/database')();

setTimeout(async () => {
  try {
    const users = await User.find({});
    console.log('=== USUÁRIOS NO BANCO ===');
    console.log('Total de usuários:', users.length);
    
    if (users.length === 0) {
      console.log('❌ NENHUM USUÁRIO ENCONTRADO - Precisa executar seed');
    } else {
      for (let user of users) {
        console.log('- Email:', user.email);
        console.log('  Username:', user.username);
        console.log('  Role:', user.role);
        console.log('  Ativo:', user.isActive);
        console.log('  Password hash existe:', !!user.password);
        console.log('---');
      }
    }
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro MongoDB:', error.message);
    process.exit(1);
  }
}, 3000);