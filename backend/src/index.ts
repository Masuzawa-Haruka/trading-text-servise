import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import userRoutes from './infrastructure/routes/userRoutes';
import itemRoutes from './infrastructure/routes/itemRoutes';
import transactionRoutes from './infrastructure/routes/transactionRoutes';
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Backend Server is running');
});

app.use('/api/items', itemRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/users', userRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
