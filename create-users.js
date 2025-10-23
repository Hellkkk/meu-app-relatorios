require('dotenv').config();
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('./config/database')();

setTimeout(async () => {
  try {
    // Deletar usuários existentes
    await User.deleteMany({});
    console.log('✅ Usuários existentes removidos');
    
    // Criar hashes das senhas
    const adminHash = await bcrypt.hash('admin123', 10);
    const managerHash = await bcrypt.hash('manager123', 10);
    const userHash = await bcrypt.hash('user123', 10);
    
    // Criar usuários
    const users = [
      {
        username: 'admin',
        email: 'admin@teste.com',
        password: adminHash,
        role: 'admin',
        isActive: true
      },
      {
        username: 'manager',
        email: 'manager@teste.com',
        password: managerHash,
        role: 'manager',
        isActive: true
      },
      {
        username: 'user',
        email: 'user@teste.com',
        password: userHash,
        role: 'user',
        isActive: true
      }
    ];
    
    const createdUsers = await User.insertMany(users);
    console.log('✅ Usuários criados:', createdUsers.length);
    
    for (let user of createdUsers) {
      console.log('- Criado:', user.email, '| Role:', user.role);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar usuários:', error.message);
    process.exit(1);
  }
}, 3000);