import express from 'express';
import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

router.post('/initiate', async (req, res) => {
  try {
    const { amount, name, email, phone } = req.body;

    const merchantId = 'YOUR_PHONEPE_MERCHANT_ID';
    const saltKey = 'YOUR_SALT_KEY';
    const saltIndex = 'YOUR_SALT_INDEX';
    const redirectUrl = 'https://yourdomain.com/payment-success';
    const callbackUrl = 'https://yourdomain.com/payment-callback';

    const payload = {
      merchantId,
      transactionId: Date.now().toString(),
      amount: amount * 100, // convert to paise
      merchantUserId: 'USER_ID',
      redirectUrl,
      redirectMode: 'POST',
      callbackUrl,
      mobileNumber: phone,
      paymentInstrument: {
        type: 'PAY_PAGE',
      },
    };

    const payloadString = JSON.stringify(payload);
    const base64Payload = Buffer.from(payloadString).toString('base64');
    const xVerify = crypto
      .createHash('sha256')
      .update(base64Payload + '/pg/v1/pay' + saltKey)
      .digest('hex') + '###' + saltIndex;

    const response = await axios.post(
      'https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay',
      { request: base64Payload },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': xVerify,
          'X-MERCHANT-ID': merchantId,
        },
      }
    );

    res.json(response.data);
  } catch (err) {
    console.error(err);
    res.status(500).send('Payment initiation failed');
  }
});

export default router;
