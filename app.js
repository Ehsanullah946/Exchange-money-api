const express = require('express');
const cors = require('cors');
const app = express();
const cookieParser = require('cookie-parser');

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));

const sequelize = require('./config/database');
const authRouter = require('./routes/authRoutes');
const customerRouter = require('./routes/customerRoute');
const employeeRouter = require('./routes/employeeRoute');
const exchangerRouter = require('./routes/exhangerRoute');
const senderRceiverRouter = require('./routes/senderReceiverRoute');
const branchRouter = require('./routes/branchRoute');
const moneyType = require('./routes/moneyTypeRoute');
const accountRouter = require('./routes/accountRoutes');
const transferRouter = require('./routes/transferRoute');
const receiveRouter = require('./routes/receiveRoutes');
const depositWithdrawRouter = require('./routes/depositWithdrawRoutes');
const accountToAccountRouter = require('./routes/accountToAccountRoute');
const expenceRouter = require('./routes/expenceRoutes');
const rateRouter = require('./routes/rateRoutes');
const exchangeRouter = require('./routes/exchangeRoutes');
const customerAuthRoute = require('./routes/customerAuthRoute');
const whatsappRouter = require('./routes/whatsapp');

const http = require('http');
const { initSocket } = require('./services/socketService');
const notificationService = require('./services/notificationService');

app.use(express.json());
app.use(cookieParser());

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/customer', customerRouter);
app.use('/api/v1/auth/customer', customerAuthRoute);
app.use('/api/v1/employee', employeeRouter);
app.use('/api/v1/exchanger', exchangerRouter);
app.use('/api/v1/senderReceiver', senderRceiverRouter);
app.use('/api/v1/branch', branchRouter);
app.use('/api/v1/moneyType', moneyType);
app.use('/api/v1/account', accountRouter);
app.use('/api/v1/transfer', transferRouter);
app.use('/api/v1/receive', receiveRouter);
app.use('/api/v1/depositWithdraw', depositWithdrawRouter);
app.use('/api/v1/accountToAccount', accountToAccountRouter);
app.use('/api/v1/expence', expenceRouter);
app.use('/api/v1/rate', rateRouter);
app.use('/api/v1/exchange', exchangeRouter);
app.use('/api/v1/whatsapp', whatsappRouter);

const server = http.createServer(app);

const io = initSocket(server);

notificationService.setWebSocketIO(io);

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message,
  });
};

app.use(errorHandler);

module.exports = app;
