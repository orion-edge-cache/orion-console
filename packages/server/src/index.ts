import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import path from "path";

import { insertEvent } from "./db/index.js";
import statusRoutes from "./routes/status.js";
import credentialsRoutes from "./routes/credentials.js";
import infrastructureRoutes from "./routes/infrastructure.js";
import configRoutes from "./routes/config.js";
import observabilityRoutes from "./routes/observability.js";
import playgroundRoutes from "./routes/playground.js";
import grafanaRoutes from "./routes/grafana.js";
import streamRoutes from "./routes/stream.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use("/api", statusRoutes);
app.use("/api", credentialsRoutes);
app.use("/api", infrastructureRoutes);
app.use("/api", configRoutes);
app.use("/api", observabilityRoutes);
app.use("/api", playgroundRoutes);
app.use("/api/grafana", grafanaRoutes);
app.use("/api", streamRoutes);

const CONFIG_PATH = path.join(__dirname, "../../orion.config.ts");

app.listen(PORT, () => {
  console.log(`✅ Orion UI backend running on http://localhost:${PORT}`);
  console.log(`📊 SQLite DB: ~/.config/orion/observability.db`);
  console.log(`⚙️  Config path: ${CONFIG_PATH}`);

  insertEvent({
    timestamp: Date.now(),
    type: "config_change",
    message: "Orion UI backend started",
  });
});
