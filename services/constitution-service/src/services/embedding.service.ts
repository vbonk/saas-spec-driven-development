import OpenAI from 'openai';

export class EmbeddingService {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Generate embedding for a given text using OpenAI's text-embedding-3-small model
   * @param text The text to generate embedding for
   * @returns Promise<number[] | null> The embedding vector or null if failed
   */
  async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Text cannot be empty');
      }

      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.trim(),
        encoding_format: 'float'
      });

      if (response.data && response.data.length > 0) {
        return response.data[0].embedding;
      }

      return null;
    } catch (error) {
      console.error('Error generating embedding:', error);
      return null;
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   * @param texts Array of texts to generate embeddings for
   * @returns Promise<(number[] | null)[]> Array of embedding vectors
   */
  async generateEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
    try {
      if (!texts || texts.length === 0) {
        return [];
      }

      // Filter out empty texts
      const validTexts = texts.filter(text => text && text.trim().length > 0);
      
      if (validTexts.length === 0) {
        return texts.map(() => null);
      }

      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: validTexts,
        encoding_format: 'float'
      });

      const embeddings: (number[] | null)[] = [];
      let validIndex = 0;

      for (const originalText of texts) {
        if (originalText && originalText.trim().length > 0) {
          if (response.data && response.data[validIndex]) {
            embeddings.push(response.data[validIndex].embedding);
          } else {
            embeddings.push(null);
          }
          validIndex++;
        } else {
          embeddings.push(null);
        }
      }

      return embeddings;
    } catch (error) {
      console.error('Error generating embeddings:', error);
      return texts.map(() => null);
    }
  }

  /**
   * Calculate cosine similarity between two embedding vectors
   * @param embedding1 First embedding vector
   * @param embedding2 Second embedding vector
   * @returns number Similarity score between -1 and 1
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embedding vectors must have the same length');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (norm1 * norm2);
  }

  /**
   * Find the most similar embeddings to a query embedding
   * @param queryEmbedding The query embedding vector
   * @param candidateEmbeddings Array of candidate embedding vectors with metadata
   * @param topK Number of top results to return
   * @returns Array of results sorted by similarity (highest first)
   */
  findMostSimilar(
    queryEmbedding: number[],
    candidateEmbeddings: { embedding: number[]; metadata: any }[],
    topK: number = 10
  ): { similarity: number; metadata: any }[] {
    const similarities = candidateEmbeddings.map(candidate => ({
      similarity: this.calculateSimilarity(queryEmbedding, candidate.embedding),
      metadata: candidate.metadata
    }));

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }
}
