const express = require("express");

const app = express();
const authRouter = require("./routes/authRoutes");

app.use(express.json());


app.use("/api/v1/auth", authRouter);



module.exports = app;