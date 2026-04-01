require("dotenv").config();

const app = require("./app");

const port = Number(process.env.PORT) || 3001;

const server = app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

// Graceful shutdown
const signals = ["SIGTERM", "SIGINT"];
signals.forEach((sig) => {
  process.on(sig, async () => {
    console.log(`\n[server] Received ${sig} – shutting down gracefully…`);
    server.close(async () => {
      try {
        const { closeAll } = require("./config/db");
        await closeAll();
        console.log("[server] Pool closed. Goodbye.");
        process.exit(0);
      } catch (err) {
        console.error("[server] Error during shutdown:", err.message);
        process.exit(1);
      }
    });
    // Force exit after 10 s
    setTimeout(() => {
      console.error("[server] Forced exit after timeout.");
      process.exit(1);
    }, 10_000);
  });
});
