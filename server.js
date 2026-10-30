// server.ts
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var port = parseInt(process.env.PORT || "3000", 10);
var host = "0.0.0.0";
app.use(express.json());
var distPath = path.resolve(__dirname, "dist");
app.use(express.static(distPath));
app.get("/healthz", (_req, res) => {
  res.status(200).send("OK");
});
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});
app.listen(port, host, () => {
  console.log(`Server listening on http://${host}:${port}`);
});
