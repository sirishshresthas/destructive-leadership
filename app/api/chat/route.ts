import { GoogleGenAI } from "@google/genai";
import { Pinecone } from "@pinecone-database/pinecone";
import { NextRequest, NextResponse } from "next/server";

// Ensure environment variables are set
if (!process.env.GOOGLE_API_KEY) {
  throw new Error("GOOGLE_API_KEY is not set in environment variables");
}
if (!process.env.PINECONE_API_KEY) {
  throw new Error("PINECONE_API_KEY is not set in environment variables");
}
if (!process.env.PINECONE_INDEX_NAME) {
  throw new Error("PINECONE_INDEX_NAME is not set in environment variables");
}

// Initialize Google Gemini and Pinecone clients
// Note: vertexai is set to false to use the REST API directly
// This is necessary for environments where the vertexai library is not available.
// If you are using the vertexai library, set vertexai to true and ensure the library is installed.
const genAI = new GoogleGenAI({
  vertexai: false,
  apiKey: process.env.GOOGLE_API_KEY,
});
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

/**
 * Generates an embedding for the given text using Google Gemini.
 * @param {string} text - The text to embed.
 * @returns {Promise<number[]>} - The embedding vector.
 */
async function getEmbedding(text: string) {
  const result = await genAI.models.embedContent({
    model: "gemini-embedding-exp-03-07",
    contents: text,
    config: {
      taskType: "SEMANTIC_SIMILARITY",
    },
  });
  return result.embeddings?.values;
}

/**
 * Searches for similar content in Pinecone using the provided query.
 * @param {string} query - The query to search for.
 * @param {number} topK - The number of top results to return.
 * @returns {Promise<any[]>} - The search results from Pinecone.
 */
async function searchSimilarContent(query: string, topK: number = 5) {
  try {
    const index = pinecone.Index(process.env.PINECONE_INDEX_NAME as string);
    const queryEmbedding = await getEmbedding(query);

    if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
      throw new Error("Failed to generate embedding for the query.");
    }

    console.log("Query embedding:", queryEmbedding);

    const searchResponse = await index.query({
      vector: queryEmbedding as number[],
      topK,
      includeMetadata: true,
    });

    return searchResponse.matches || [];
  } catch (error) {
    console.error("Error searching Pinecone:", error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Search for relevant context in Pinecone
    const similarContent = await searchSimilarContent(message);

    // Prepare context from search results
    const context = similarContent
      .map((match) => match.metadata?.text || "")
      .filter((text) => text.toString().length > 0)
      .join("\n\n");

    const systemPrompt = `You are a specialized AI assistant for the "Research Handbook on Destructive Leadership" book. You have access to the complete content of this academic book through a vector database.

Your role is to:
- Answer questions exclusively based on the book's content
- Provide chapter summaries and synopses when requested
- Help users understand concepts from destructive leadership research
- Reference specific chapters, authors, and sections when relevant
- Explain academic concepts in an accessible way
- Provide comprehensive overviews of the book's structure and content

When users ask about:
- Chapter summaries: Provide detailed overviews of specific chapters
- Book structure: Explain how the book is organized and its main themes
- Specific concepts: Draw from the book's research and findings
- Authors and contributors: Reference the various chapter authors and their expertise
- Research findings: Summarize key studies and conclusions from the book

Always maintain an academic tone while being helpful and informative.`;

    const prompt =
      context.length > 0
        ? `${systemPrompt}

Based on the following content from the "Research Handbook on Destructive Leadership":

${context}

User Question: ${message}

Please provide a comprehensive answer based on the book's content. If asking for chapter summaries or book structure, be as detailed as possible. Include relevant page references or chapter information when available.`
        : `${systemPrompt}

User Question: ${message}

I don't have specific content from the book to answer this question. Please rephrase your question or ask about specific chapters, concepts, or topics that would be covered in the Research Handbook on Destructive Leadership.`;

    // const prompt = context
    //   ? `Based on the following context, please answer the user's question. If the context doesn't contain relevant information, please say so and provide a general response.

    //     Context:
    //     ${context}

    //     User Question: ${message}

    //     Response:`
    //   : `Please answer the following question: ${message}`;

    // Generate response with Gemini
    const response = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        temperature: 0.9,
        topK: 40,
      },
    });

    const text = await response.text;

    return NextResponse.json({
      response: text,
      hasContext: context.length > 0,
      sources: similarContent.length,
    });
  } catch (error) {
    console.error("Error in chat API:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
