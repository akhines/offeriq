import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { authStorage } from "./storage";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      async (email, password, done) => {
        try {
          const user = await authStorage.getUserByEmail(email);
          if (!user || !user.passwordHash) {
            return done(null, false, { message: "Invalid email or password" });
          }
          const isValid = await bcrypt.compare(password, user.passwordHash);
          if (!isValid) {
            return done(null, false, { message: "Invalid email or password" });
          }
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user: any, cb) => cb(null, user.id));
  passport.deserializeUser(async (id: string, cb) => {
    try {
      const user = await authStorage.getUser(id);
      cb(null, user || null);
    } catch (error) {
      cb(error);
    }
  });

  // Login
  app.post("/api/login", (req, res, next) => {
    passport.authenticate(
      "local",
      (err: any, user: any, info: any) => {
        if (err) {
          return res.status(500).json({ message: "Internal server error" });
        }
        if (!user) {
          return res.status(401).json({ message: info?.message || "Invalid email or password" });
        }
        req.logIn(user, (loginErr) => {
          if (loginErr) {
            return res.status(500).json({ message: "Failed to create session" });
          }
          // Return user without passwordHash
          const { passwordHash, ...safeUser } = user;
          return res.json(safeUser);
        });
      }
    )(req, res, next);
  });

  // Register
  app.post("/api/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const existing = await authStorage.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ message: "An account with this email already exists" });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await authStorage.upsertUser({
        email,
        passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
      });

      req.logIn(user, (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ message: "Account created but failed to log in" });
        }
        const { passwordHash: _, ...safeUser } = user;
        return res.json(safeUser);
      });
    } catch (error) {
      console.error("Registration error:", error);
      return res.status(500).json({ message: "Failed to create account" });
    }
  });

  // Logout
  app.post("/api/logout", (req, res) => {
    req.logout(() => {
      req.session.destroy(() => {
        res.json({ ok: true });
      });
    });
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  // API key auth for agent/programmatic access
  const apiKey = req.headers["x-api-key"] as string;
  if (apiKey && process.env.OFFERIQ_API_KEY && apiKey === process.env.OFFERIQ_API_KEY) {
    return next();
  }

  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  return next();
};
