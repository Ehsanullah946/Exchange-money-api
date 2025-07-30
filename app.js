const express = require("express");

const app = express();
const authRouter = require("./routes/authRoutes");
const customerRouter = require("./routes/customerRoute");
const employeeRouter = require("./routes/employeeRoute");
const exchangerRouter = require("./routes/exhangerRoute");
const senderRceiverRouter = require("./routes/customerRoute");

app.use(express.json());


app.use("/api/v1/auth", authRouter);
app.use("/api/v1/customer", customerRouter);
app.use("/api/v1/employee", employeeRouter);
app.use("/api/v1/exchanger", exchangerRouter);
app.use("/api/v1/senderReceiver", senderRceiverRouter);




module.exports = app;