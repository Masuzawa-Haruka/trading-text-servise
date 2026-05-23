import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import userRoutes from './infrastructure/routes/userRoutes';
import itemRoutes from './infrastructure/routes/itemRoutes';
import transactionRoutes from './infrastructure/routes/transactionRoutes';
import priceOfferRoutes from './infrastructure/routes/priceOfferRoutes';
import scheduleProposalRoutes from './infrastructure/routes/scheduleProposalRoutes';
import messageRoutes from './infrastructure/routes/messageRoutes';
import evaluationRoutes from './infrastructure/routes/evaluationRoutes';
import cancellationRoutes from './infrastructure/routes/cancellationRoutes';
import reportRoutes from './infrastructure/routes/reportRoutes';

const app = express();
const port = process.env.PORT || 3001;
const host = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Backend Server is running');
});

app.get('/health', (req, res) => {
  res.status(200).json({ ok: true });
});

app.use('/api/items', itemRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/price-offers', priceOfferRoutes);
app.use('/api/schedule-proposals', scheduleProposalRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/cancellations', cancellationRoutes);
app.use('/api/reports', reportRoutes);

app.listen(Number(port), host, () => {
  console.log(`Server is running at http://${host}:${port}`);
});
