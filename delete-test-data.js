const mongoose = require('mongoose');
require('dotenv').config();
const Purchase = require('./models/Purchase');

async function deleteTestData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const result = await Purchase.deleteMany({});
    console.log(`Deleted ${result.deletedCount} purchase records`);
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

deleteTestData();
