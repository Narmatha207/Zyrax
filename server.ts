import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import cors from "cors";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "zyrax-secret-key-2024";

// Database setup
const db = new Database("zyrax.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS designs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    imageUrl TEXT NOT NULL,
    prompt TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
  );
`);

// Cloudinary setup (optional, will fallback to local/base64 if not configured)
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Access denied" });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
};

// --- API Routes ---

// Auth
app.post("/api/auth/signup", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const stmt = db.prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");
    const result = stmt.run(name, email, hashedPassword);
    const token = jwt.sign({ id: result.lastInsertRowid, email, name }, JWT_SECRET);
    res.json({ token, user: { id: result.lastInsertRowid, name, email } });
  } catch (error: any) {
    if (error.code === "SQLITE_CONSTRAINT") {
      res.status(400).json({ error: "Email already exists" });
    } else {
      res.status(500).json({ error: "Server error" });
    }
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    if (!user) return res.status(400).json({ error: "User not found" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: "Invalid password" });

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Designs
app.get("/api/design/mydesigns", authenticateToken, (req: any, res) => {
  const designs = db.prepare("SELECT * FROM designs WHERE userId = ? ORDER BY createdAt DESC").all(req.user.id);
  res.json(designs);
});

app.post("/api/design/save", authenticateToken, async (req: any, res) => {
  const { imageUrl, prompt } = req.body;
  try {
    const stmt = db.prepare("INSERT INTO designs (userId, imageUrl, prompt) VALUES (?, ?, ?)");
    const result = stmt.run(req.user.id, imageUrl, prompt);
    res.json({ id: result.lastInsertRowid, imageUrl, prompt });
  } catch (error) {
    res.status(500).json({ error: "Failed to save design" });
  }
});

app.delete("/api/design/delete/:id", authenticateToken, (req: any, res) => {
  const { id } = req.params;
  try {
    const stmt = db.prepare("DELETE FROM designs WHERE id = ? AND userId = ?");
    stmt.run(id, req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete design" });
  }
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
