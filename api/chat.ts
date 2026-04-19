
export const config = {
  runtime: 'nodejs', // Use Node.js runtime for broad compatibility
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: { message: "Method Not Allowed" } });
  }

  try {
    const { model, messages, stream, temperature, tools } = req.body;
    
    const baseUrl = process.env.AI_BASE_URL || "https://api.openrouter.ai/api/v1";
    const apiKey = process.env.AI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ 
        error: { message: "AI_API_KEY is not configured on the server environment." } 
      });
    }

    console.log(`[Vercel Proxy] Routing to: ${baseUrl}/chat/completions (${model})`);

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: stream !== false,
        temperature: temperature ?? 0.7,
        ...(tools ? { tools } : {})
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).send(errorText);
    }

    if (stream !== false) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      if (!response.body) {
        return res.status(500).send("No response body from AI provider");
      }

      // Forward stream using standard Node.js response writing
      const reader = response.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
          // Standard serverless environments might need flushing, but res.write is usually enough for Vercel Node
        }
      } catch (err) {
        console.error("[Vercel Stream Error]", err);
      } finally {
        res.end();
      }
    } else {
      const data = await response.json();
      res.status(200).json(data);
    }
  } catch (error) {
    console.error("[Vercel API Error]:", error);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
}
