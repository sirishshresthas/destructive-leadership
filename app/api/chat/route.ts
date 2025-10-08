// app/api/chat/route.ts
import { GoogleGenAI } from "@google/genai";
import { QdrantClient } from "@qdrant/js-client-rest";
import { NextRequest, NextResponse } from "next/server";

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY!;
const QDRANT_HOST = process.env.QDRANT_HOST!;
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION!;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY!;

if (!GOOGLE_API_KEY) throw new Error("GOOGLE_API_KEY is not set");
if (!QDRANT_HOST) throw new Error("QDRANT_HOST is not set");
if (!QDRANT_COLLECTION) throw new Error("QDRANT_COLLECTION is not set");
if (!QDRANT_API_KEY) throw new Error("QDRANT_API_KEY is not set");

// --- Google Gen AI (Gemini) client ---
const genAI = new GoogleGenAI({
  apiKey: GOOGLE_API_KEY,
  // apiVersion: "v1",
  vertexai: false,
});

// --- Qdrant client ---
const qdrant = new QdrantClient({
  url: QDRANT_HOST,
  apiKey: QDRANT_API_KEY,
  checkCompatibility: false,
  https: QDRANT_HOST.startsWith("https"),
});

// Stable embedding model; the old exp-03-07 is being phased out.
async function getEmbedding(text: string): Promise<number[]> {
  const result = await genAI.models.embedContent({
    model: "gemini-embedding-001",
    contents: [text], // simple form; SDK wraps as a user message
    config: { taskType: "QUESTION_ANSWERING" },
  });
  const vec = result.embeddings?.[0]?.values;
  if (!vec) throw new Error("No embeddings returned");
  return vec;
}

async function searchSimilarContent(query: string, topK = 20) {
  try {
    const queryEmbedding = await getEmbedding(query);
    const searchResponse = await qdrant.search(QDRANT_COLLECTION, {
      vector: queryEmbedding,
      limit: topK,
      with_payload: true,
    });
    return searchResponse;
  } catch (err) {
    console.error("Error searching Qdrant:", err);
    return [];
  }
}

// --- Role normalizer: only 'user' or 'model' are valid ---
function normalizeRole(role: string): "user" | "model" {
  if (role === "assistant" || role === "model") return "model";
  if (role === "user") return "user";
  // treat any other (e.g., 'system') as a user message
  return "user";
}

export async function POST(request: NextRequest) {
  try {
    const { message, history = [] } = (await request.json()) as {
      message: string;
      history?: Array<{ role: string; content: string }>;
    };

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const similar = await searchSimilarContent(message);
    const context =
      similar
        ?.map((m: any) => m?.payload?.content || "")
        .filter(Boolean)
        .join("\n\n") ?? "";

    // Put your behavior into systemInstruction (official field)
    const systemInstruction = `Do not start your response with any acknowledgment phrases like "Okay", "Sure", "Got it", or "I understand." Always begin with the most relevant information or answer to the user’s question. Do not include any prefatory filler.

When the vector database is provided, it may have irrelevant information. Use it only if it is relevant to the question.

If the user asks for a summary, provide a concise summary in bullet points.
If the user asks for a chapter summary, provide a detailed summary of that chapter.
If the user asks for the book structure, provide a detailed description of the book's structure including chapters and sections.
If the user asks for specific concepts or definitions, provide clear and accurate explanations based on the book's content.

You are an expert AI assistant trained exclusively on the full content of the *Research Handbook on Destructive Leadership*. You have access to a vector database containing detailed semantic chunks of this academic book, along with structured metadata about chapters and content sections.

Your responsibilities include:

Content-Specific Responses:
- Answer questions strictly based on the book's content.
- Reference specific chapters, sections, or pages when relevant.
- Summarize or explain complex academic and theoretical concepts in a clear and accessible tone.
- Provide concise or detailed summaries of individual chapters or the entire book on request.

Structural & Organizational Guidance:
- Describe the structure of the book (e.g., number of chapters, thematic groupings, flow of content).
- Explain how chapters relate to key themes in destructive leadership.
- Identify and describe chapter authors and contributors, where available.`.trim();

    // Build a clean contents array with ONLY 'user' | 'model' roles
    const contents = [
      // (Optional) include retrieved context as a user message
      ...(context
        ? [{ role: "user" as const, parts: [{ text: `Relevant retrieved context:\n${context}` }] }]
        : []),

      // History normalized
      ...history
        .map((h) => ({
          role: normalizeRole(h.role),
          parts: [{ text: (h.content ?? "").toString() }],
        }))
        .filter((c) => c.parts[0].text.length > 0),

      // Current user message last
      { role: "user" as const, parts: [{ text: message }] },
    ];

    const resp = await genAI.models.generateContent({
      model: "gemini-2.5-pro",
      contents, // roles guaranteed valid here
      config: {
        temperature: 0.9,
        topK: 40,
        systemInstruction, // official field for system behavior
      },
    });

    const text = resp.text ?? "";

    return NextResponse.json({
      response: text,
      hasContext: context.length > 0,
      sources: (similar ?? []).map((m: any) => ({
        chapter_num: m.payload?.chapter_num,
        chapter_title: m.payload?.chapter_title,
        page_num: m.payload?.page_num,
      })),
    });
  } catch (error) {
    console.error("Error in chat API:", error);
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500 });
  }
}
