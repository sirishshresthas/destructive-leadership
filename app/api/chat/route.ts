import { GoogleGenAI } from "@google/genai";
import { QdrantClient } from "@qdrant/js-client-rest";
import { NextRequest, NextResponse } from "next/server";

// Ensure environment variables are set
if (!process.env.GOOGLE_API_KEY) {
  throw new Error("GOOGLE_API_KEY is not set in environment variables");
}
if (!process.env.QDRANT_HOST) {
  throw new Error("QDRANT_HOST is not set in environment variables");
}
if (!process.env.QDRANT_COLLECTION) {
  throw new Error("QDRANT_COLLECTION is not set in environment variables");
}

// Initialize Google Gemini and qdrant clients
const genAI = new GoogleGenAI({
  vertexai: false,
  apiKey: process.env.GOOGLE_API_KEY,
});


const qdrant = new QdrantClient({
  url: process.env.QDRANT_HOST,
  apiKey: process.env.QDRANT_API_KEY,
  checkCompatibility: false,
  https: true,
});

/**
 * Generates an embedding for the given text using Google Gemini.
 * @param {string} text - The text to embed.
 * @returns {Promise<number[]>} - The embedding vector.
 */
async function getEmbedding(text: string) {
  const result = await genAI.models.embedContent({
    model: "gemini-embedding-exp-03-07",
    contents: [{ text }],
    config: { taskType: "QUESTION_ANSWERING" },
  });

  if (result.embeddings?.[0]) return result.embeddings[0].values;
  throw new Error("No embeddings returned");
}

async function searchSimilarContent(query: string, topK: number = 20) {
  try {
    const queryEmbedding = await getEmbedding(query);

    const searchResponse =
      queryEmbedding &&
      (await qdrant.search(process.env.QDRANT_COLLECTION!, {
        vector: queryEmbedding,
        limit: topK,
        with_payload: true,
      }));

    return searchResponse;
  } catch (error) {
    console.error("Error searching Qdrant:", error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json(); // expects history: { role: 'user'|'assistant', content: string }[]
        if (!message) {
          return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }
    
    const similarContent = await searchSimilarContent(message);
    
    const context = similarContent && similarContent
      .map((match) => match.payload?.content || "")
      .filter(Boolean)
      .join("\n\n");

    const systemPrompt = `Do not start your response with any acknowledgment phrases like "Okay", "Sure", "Got it", or "I understand." Always begin with the most relevant information or answer to the user’s question. Do not include any prefatory filler.

When the vector database is provided, it may have irrelevant information. Use it only if it is relevant to the question.

If the user asks for a summary, provide a concise summary in bullet points.
If the user asks for a chapter summary, provide a detailed summary of that chapter.
If the user asks for the book structure, provide a detailed description of the book's structure including chapters and sections.
If the user asks for specific concepts or definitions, provide clear and accurate explanations based on the book's content.

You are an expert AI assistant trained exclusively on the full content of the *Research Handbook on Destructive Leadership*. You have access to a vector database containing detailed semantic chunks of this academic book, along with structured metadata about chapters and content sections.

Your responsibilities include:

Content-Specific Responses:
- Answer questions strictly based on the book’s content.
- Reference specific chapters, sections, or pages when relevant.
- Summarize or explain complex academic and theoretical concepts in a clear and accessible tone.
- Provide concise or detailed summaries of individual chapters or the entire book on request.

Structural & Organizational Guidance:
- Describe the structure of the book (e.g., number of chapters, thematic groupings, flow of content).
- Explain how chapters relate to key themes in destructive leadership.
- Identify and describe chapter authors and contributors, where available.`;

const geminiMessages = [
      { role: "user", parts: [{ text: systemPrompt }] },
      ...history.map((msg: { role: string; content: string }) => ({
        role: msg.role as "user" | "model",
        parts: [{ text: msg.content }],
      })),
      ...(context
        ? [{ role: "user", parts: [{ text: `Relevant retrieved context:\n${context}` }] }]
        : []),
      { role: "user", parts: [{ text: message }] },
    ];

    const response = await genAI.models.generateContent({
      model: "gemini-1.5-pro-latest",
      contents: geminiMessages,
      config: {
        temperature: 0.9,
        topK: 40,
      },
    });

    const text = await response.text;

    return NextResponse.json({
      response: text,
      hasContext: context && context.length > 0,
      sources: similarContent && similarContent.map((match) => ({
        chapter_num: match.payload?.chapter_num,
        chapter_title: match.payload?.chapter_title,
        page_num: match.payload?.page_num,
      })),
    });
  } catch (error) {
    console.error("Error in chat API:", error);
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500 });
  }
}
