import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 4000),
  mode: process.env.PAYPAL_MODE || 'mock', // 'mock' | 'sandbox'
  paypalBase: process.env.PAYPAL_BASE || 'https://api-m.sandbox.paypal.com',
  seller: {
    id: process.env.PAYPAL_SELLER_CLIENT_ID || '',
    secret: process.env.PAYPAL_SELLER_CLIENT_SECRET || '',
  },
  buyer: {
    id: process.env.PAYPAL_BUYER_CLIENT_ID || '',
    secret: process.env.PAYPAL_BUYER_CLIENT_SECRET || '',
  },
  agentsUrl: process.env.AGENTS_URL || 'http://localhost:8000',
  mongoUri: process.env.MONGODB_URI || '',
  pollSeconds: Number(process.env.POLL_SECONDS || 45),
  maxRounds: 6,
};
