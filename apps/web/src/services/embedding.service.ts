import OpenAI from "openai";
import { prisma } from "@/lib/db";

const openai = new OpenAI(); // reads OPENAI_API_KEY from env

/**
 * Generate a 1536-dimensional embedding vector for the given text using
 * OpenAI's text-embedding-3-small model.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return res.data[0]!.embedding;
}

interface ContextChunk {
  content: string;
  sourceUrl: string;
}

/**
 * Retrieve the top-k most relevant embedding document chunks for a given
 * query using pgvector cosine similarity (<=>).
 *
 * Returns an empty array when no documents have been indexed for the chatbot
 * yet — the bot will still answer using its system prompt alone.
 */
export async function retrieveContext(
  chatbotId: string,
  tenantId: string,
  query: string,
  topK = 5
): Promise<ContextChunk[]> {
  const [{ count }] = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
    `SELECT COUNT(*) AS count FROM embedding_documents
     WHERE "chatbotId" = $1::uuid AND "tenantId" = $2::uuid AND embedding IS NOT NULL`,
    chatbotId,
    tenantId
  );
  if (count === 0n) return [];

  const embedding = await generateEmbedding(query);
  // Vector literal is safe to inline — it contains only numbers and commas
  const vectorStr = `[${embedding.join(",")}]`;

  return prisma.$queryRawUnsafe<ContextChunk[]>(
    `SELECT content, "sourceUrl"
     FROM embedding_documents
     WHERE "chatbotId" = $1::uuid
       AND "tenantId" = $2::uuid
       AND embedding IS NOT NULL
     ORDER BY embedding <=> $3::vector
     LIMIT $4`,
    chatbotId,
    tenantId,
    vectorStr,
    topK
  );
}
