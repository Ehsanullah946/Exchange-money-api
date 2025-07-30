const express = require("express");

const app = express();
const authRouter = require("./routes/authRoutes");
const customerRouter = require("./routes/customerRoute");

app.use(express.json());


app.use("/api/v1/auth", authRouter);
app.use("/api/v1/customer", customerRouter);




module.exports = app;