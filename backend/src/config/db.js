const mongoose = require('mongoose');
const env = require('./env');

async function connectDB(uri) {
  const mongoUri = uri || env.MONGO_URI;
  mongoose.set('strictQuery', true);
  await mongoose.connect(mongoUri);
  return mongoose.connection;
}

module.exports = connectDB;
