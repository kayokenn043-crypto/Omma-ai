import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Set up JSON parsers with high limits to allow base64 image uploads in chat
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));

// Lazy initializer for Google Gen AI
let aiClient: GoogleGenAI | null = null;
function getGenAI() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      throw new Error("API_KEY_MISSING");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// 1. Chat Completion Endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, systemInstruction, webSearch } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "الرجاء توفير مصفوفة من الرسائل." });
    }

    let ai;
    try {
      ai = getGenAI();
    } catch (e: any) {
      if (e.message === "API_KEY_MISSING") {
        return res.status(401).json({
          error: "api_key_missing",
          message: "مفتاح API الخاص بـ Gemini غير متوفر. يرجى تهيئته عبر Settings > Secrets."
        });
      }
      throw e;
    }

    // Convert message list to Gemini structure
    // Role mapping: 'user' keeps 'user', 'assistant' maps to 'model'
    const contents: any[] = [];
    
    // We want to processes all previous messages to construct the conversational context
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const role = msg.role === "assistant" ? "model" : "user";
      
      const parts: any[] = [];
      
      if (msg.content) {
        parts.push({ text: msg.content });
      }
      
      // Handle multimodal query if an image was uploaded
      if (msg.role === "user" && msg.imageBase64) {
        const base64Data = msg.imageBase64.split(",")[1] || msg.imageBase64;
        let mimeType = "image/png";
        
        // Dynamic mime parsing if possible
        if (msg.imageBase64.includes("image/jpeg")) mimeType = "image/jpeg";
        else if (msg.imageBase64.includes("image/webp")) mimeType = "image/webp";
        
        parts.push({
          inlineData: {
            mimeType,
            data: base64Data
          }
        });
      }

      contents.push({
        role,
        parts
      });
    }

    // Prepare Gemini Config
    const config: any = {
      systemInstruction: systemInstruction || "You are Sero AI, an incredibly smart, polite and visually appealing AI built by Sero company. Answer beautifully in the user's language.",
      temperature: 0.7,
    };

    // Integrate live search grounding if enabled
    if (webSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    // Call the model
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config
    });

    const text = response.text || "";
    
    // Extract search grounding metadata sources if available
    const groundingSources: any[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks && Array.isArray(chunks)) {
      chunks.forEach((chunk: any) => {
        if (chunk.web && chunk.web.uri && chunk.web.title) {
          groundingSources.push({
            title: chunk.web.title,
            url: chunk.web.uri
          });
        }
      });
    }

    return res.json({
      content: text,
      groundingSources: groundingSources.length > 0 ? groundingSources : undefined
    });

  } catch (error: any) {
    console.error("Error in Sero AI Chat API:", error);
    return res.status(500).json({ 
      error: "server_error",
      message: error.message || "حدث خطأ غير متوقع أثناء معالجة طلبك."
    });
  }
});

// 2. Image Generation Endpoint
app.post("/api/generate-image", async (req, res) => {
  try {
    const { prompt, aspectRatio } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: "الرجاء توفير الوصف النصي للصورة." });
    }

    let ai;
    try {
      ai = getGenAI();
    } catch (e: any) {
      if (e.message === "API_KEY_MISSING") {
        return res.status(401).json({
          error: "api_key_missing",
          message: "مفتاح API الخاص بـ Gemini غير متوفر. يرجى تهيئته عبر Settings > Secrets."
        });
      }
      throw e;
    }

    // Step A: Prompt Enhancement using Gemini Flash to generate beautiful, highly descriptive prompts
    let enhancedPrompt = prompt;
    try {
      const promptEnhancement = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `You are an expert prompt engineer for AI image generators. Enrich the following image query written by the user to make it artistic, photorealistic, and highly detailed. The prompt is: "${prompt}". Write ONLY the final enhanced English prompt.`,
      });
      if (promptEnhancement.text) {
        enhancedPrompt = promptEnhancement.text.trim();
      }
    } catch (err) {
      console.warn("Could not enhance prompt, using original:", err);
    }

    // Step B: Generate the image using gemini-2.5-flash-image (default config from skill)
    // Note: This model is a paid-category model, but we handle the billing key requirements gracefully
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: enhancedPrompt,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio || "1:1",
        }
      }
    });

    let imageBase64 = "";
    
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          imageBase64 = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!imageBase64) {
      return res.status(500).json({
        error: "generation_failed",
        message: "لم نتمكن من استخراج بيانات الصورة من استجابة النموذج."
      });
    }

    return res.json({
      url: imageBase64,
      enhancedPrompt,
      aspectRatio: aspectRatio || "1:1"
    });

  } catch (error: any) {
    console.error("Error in Sero AI Image Gen API:", error);
    
    // Offer detailed guidance for Billing flow if key doesn't have privileges
    if (error.message && (error.message.includes("quota") || error.message.includes("billing") || error.message.includes("permission"))) {
      return res.status(403).json({
        error: "billing_or_paid_model_required",
        message: "توليد الصور يتطلب تفعيل مفتاح واجهة برمجة التطبيقات مدفوع من خلال إعدادات AI Studio (Paid Model Flow)."
      });
    }
    
    return res.status(500).json({
      error: "server_error",
      message: error.message || "فشل توليد الصورة."
    });
  }
});

// 3. Text-to-Speech (TTS) Endpoint
app.post("/api/tts", async (req, res) => {
  try {
    const { text, voice } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: "الرجاء توفير النص لتحويله لكلام." });
    }

    let ai;
    try {
      ai = getGenAI();
    } catch (e: any) {
      if (e.message === "API_KEY_MISSING") {
        return res.status(401).json({
          error: "api_key_missing",
          message: "مفتاح API الخاص بـ Gemini غير متوفر. يرجى تهيئته عبر Settings > Secrets."
        });
      }
      throw e;
    }

    // Select dynamic voice. Prebuilt voices: 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
    // Default to 'Kore' for dynamic speech
    const selectedVoice = voice || "Kore";

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Say clearly: ${text}` }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: selectedVoice },
          },
        },
      },
    });

    let base64Audio = "";
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          base64Audio = part.inlineData.data;
          break;
        }
      }
    }

    if (!base64Audio) {
      return res.status(500).json({
        error: "tts_failed",
        message: "فشل استخراج البيانات الصوتية من الخادم."
      });
    }

    return res.json({
      audio: base64Audio
    });

  } catch (error: any) {
    console.error("Error in TTS API:", error);
    return res.status(500).json({
      error: "server_error",
      message: error.message || "حدث خطأ أثناء تحويل النص إلى كلام."
    });
  }
});

// ----------------------------------------------------
// FRONTEND MIDDLEWARE & INTEGRATION
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Vite Dev Middleware Configuration
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server middleware loaded.");
  } else {
    // Production static asset build serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log("Static production assets mounted.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Sero AI running on fullstack ingress http://0.0.0.0:${PORT}`);
  });
}

startServer();
