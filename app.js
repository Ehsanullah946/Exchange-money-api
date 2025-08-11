const express = require("express");

const app = express();
const sequelize=require("./config/database")
const authRouter = require("./routes/authRoutes");
const customerRouter = require("./routes/customerRoute");
const employeeRouter = require("./routes/employeeRoute");
const exchangerRouter = require("./routes/exhangerRoute");
const senderRceiverRouter = require("./routes/senderReceiverRoute");
const branchRouter = require("./routes/branchRoute");
const moneyType = require("./routes/moneyTypeRoute");
const accountRouter = require("./routes/accountRoutes");
const transferRouter = require("./routes/transferRoute");
const receiveRouter = require("./routes/receiveRoutes");

app.use(express.json());


app.use("/api/v1/auth", authRouter);
app.use("/api/v1/customer", customerRouter);
app.use("/api/v1/employee", employeeRouter);
app.use("/api/v1/exchanger", exchangerRouter);
app.use("/api/v1/senderReceiver", senderRceiverRouter);
app.use("/api/v1/branch", branchRouter);
app.use("/api/v1/moneyType", moneyType);
app.use("/api/v1/account", accountRouter);
app.use("/api/v1/transfer", transferRouter);
app.use("/api/v1/receive", receiveRouter);


module.exports = app;