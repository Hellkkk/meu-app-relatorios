const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
app.use(express.json());

const mongoDBPassword = process.env.MONGO_DB_PASSWORD;
const mongoDBUri = `mongodb+srv://<username>:` + mongoDBPassword + `@cluster0.mongodb.net/myDatabase?retryWrites=true&w=majority`;

mongoose.connect(mongoDBUri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected!'))
    .catch(err => console.error(err));

// Your user model and routes will go here

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
