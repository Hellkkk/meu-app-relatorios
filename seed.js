const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Company = require('./models/Company');
require('dotenv').config();

// Configurar conexão com MongoDB usando a mesma lógica do server.js
const fs = require('fs');
const path = require('path');

const localEnvPath = path.resolve(__dirname, '.env');
const parentEnvPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(localEnvPath)) {
  require('dotenv').config({ path: localEnvPath });
} else if (fs.existsSync(parentEnvPath)) {
  require('dotenv').config({ path: parentEnvPath });
}

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL;
    
    if (!mongoUri) {
      throw new Error('MongoDB connection string is not defined in environment variables');
    }
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('MongoDB Connected for seeding');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    await connectDB();
    
    // Verificar se já existe um admin
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
      return;
    }
    
    // Criar usuário admin
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = new User({
      username: 'admin',
      email: 'admin@teste.com',
      password: adminPassword,
      role: 'admin',
      isActive: true,
      profile: {
        firstName: 'Administrador',
        lastName: 'Sistema'
      }
    });
    
    await admin.save();
    console.log('Admin user created:', admin.email);
    
    // Criar usuário regular de teste
    const userPassword = await bcrypt.hash('user123', 10);
    const user = new User({
      username: 'user_teste',
      email: 'user@teste.com',
      password: userPassword,
      role: 'user',
      isActive: true,
      profile: {
        firstName: 'Usuário',
        lastName: 'Teste'
      }
    });
    
    await user.save();
    console.log('Test user created:', user.email);
    
    // Criar algumas empresas de exemplo
    const companies = [
      {
        name: 'Empresa Alpha Ltda',
        cnpj: '11.222.333/0001-44',
        description: 'Empresa de tecnologia',
        sector: 'Tecnologia',
        createdBy: admin._id,
        contact: {
          email: 'contato@alpha.com.br',
          phone: '(11) 1234-5678'
        }
      },
      {
        name: 'Beta Consultoria ME',
        cnpj: '22.333.444/0001-55',
        description: 'Consultoria empresarial',
        sector: 'Consultoria',
        createdBy: admin._id,
        contact: {
          email: 'contato@beta.com.br',
          phone: '(11) 2345-6789'
        }
      }
    ];
    
    const createdCompanies = await Company.insertMany(companies);
    console.log(`${createdCompanies.length} companies created`);
    
    // Associar uma empresa ao usuário teste
    user.companies = [createdCompanies[0]._id];
    await user.save();
    console.log('User associated with company:', createdCompanies[0].name);
    
    console.log('\n=== SEED COMPLETED ===');
    console.log('Login credentials:');
    console.log('Admin: admin@teste.com / admin123');
    console.log('User: user@teste.com / user123');
    console.log('=====================');
    
  } catch (error) {
    console.error('Seed error:', error);
  } finally {
    mongoose.disconnect();
  }
};

seedData();