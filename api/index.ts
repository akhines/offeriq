import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "../server/routes";
import { createServer } from "http";

const app = express();

// CORS
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.includes("vercel.app") || origin.includes("localhost")) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
}));

// Stripe webhook needs raw body — must come before json parser
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  // Webhook handling will be registered via registerRoutes
  res.status(200).json({ received: true });
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Rate limiting
app.use("/api", rateLimit({ windowMs: 60_000, max: 100, standardHeaders: true, legacyHeaders: false }));
app.use("/api/ai", rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false }));
app.use("/api/property", rateLimit({ windowMs: 60_000, max: 20, standardHeaders: true, legacyHeaders: false }));
app.use("/api/comps", rateLimit({ windowMs: 60_000, max: 20, standardHeaders: true, legacyHeaders: false }));

// Auth + routes
const httpServer = createServer(app);

const setup = (async () => {
  const { setupAuth, registerAuthRoutes } = await import("../server/replit_integrations/auth");
  await setupAuth(app);
  registerAuthRoutes(app);
  await registerRoutes(httpServer, app);
})();

export default async function handler(req: any, res: any) {
  await setup;
  app(req, res);
}
