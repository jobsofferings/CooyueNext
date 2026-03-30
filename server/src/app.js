const express = require("express");
const cors = require("cors");
const path = require("path");

const healthRouter = require("./routes/health");

const app = express();
const staticDir = path.join(__dirname, "..", "static");

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/static", express.static(staticDir));

app.get("/", (_req, res) => {
  res.json({
    message: "Server is running.",
  });
});

app.use("/api/health", healthRouter);

module.exports = app;
