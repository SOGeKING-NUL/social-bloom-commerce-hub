const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const Payment = require('./models/payment');

dotenv.config();

const app = express();
app.use(express.json()); // For JSON body parsing

// Connect to DB
connectDB();

// Dummy payment POST endpoint
app.post('/api/payment', async (req, res) => {
  try {
    const { name, amount } = req.body;
    const payment = new Payment({ name, amount, success: true });
    await payment.save();
    res.status(201).json({ message: 'Payment saved!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
