import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import createSecretRouter from './routes/shorten';
import viewSecretRouter from './routes/redirect';

dotenv.config();
const app = express();

app.use(cors()); // Enable CORS for all routes
app.use(express.json());
app.use('/', viewSecretRouter);
app.use('/create', createSecretRouter);

export default app; 