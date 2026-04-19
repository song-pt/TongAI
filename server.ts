import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Proxy for AI Chat with Streaming support
  app.post("/api/chat", async (req, res) => {
    try {
      const { model, messages, stream, temperature, tools } = req.body;
      
      // Prioritize Server-side Environment Variables as requested by user
      const baseUrl = process.env.AI_BASE_URL || "https://api.openrouter.ai/api/v1";
      const apiKey = process.env.AI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ 
          error: { message: "AI_API_KEY is not configured on the server environment." } 
        });
      }

      console.log(`[Proxy] Routing request to: ${baseUrl}/chat/completions (Model: ${model})`);

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          // User requested hiding original IP. 
          // We do NOT forward headers like 'x-forwarded-for' from the client.
        },
        body: JSON.stringify({
          model,
          messages,
          stream: stream !== false, // Stream by default for better Vercel timeout handling
          temperature: temperature ?? 0.7,
          ...(tools ? { tools } : {})
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[AI Provider Error] ${response.status}: ${errorText}`);
        return res.status(response.status).send(errorText);
      }

      // Handle Streaming vs Static Response
      if (stream !== false) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        if (!response.body) {
           return res.status(500).send("No response body from AI provider");
        }

        // Forward the stream
        const reader = response.body.getReader();
        const encoder = new TextEncoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
        } catch (err) {
          console.error("[Stream Error]", err);
        } finally {
          res.end();
        }
      } else {
        const data = await response.json();
        res.json(data);
      }
    } catch (error) {
      console.error("[Server Error] /api/chat:", error);
      res.status(500).json({ error: { message: "Internal Server Error" } });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
