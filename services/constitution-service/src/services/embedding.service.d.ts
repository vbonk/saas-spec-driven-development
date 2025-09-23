export declare class EmbeddingService {
    private openai;
    constructor();
    /**
     * Generate embedding for a given text using OpenAI's text-embedding-3-small model
     * @param text The text to generate embedding for
     * @returns Promise<number[] | null> The embedding vector or null if failed
     */
    generateEmbedding(text: string): Promise<number[] | null>;
    /**
     * Generate embeddings for multiple texts in batch
     * @param texts Array of texts to generate embeddings for
     * @returns Promise<(number[] | null)[]> Array of embedding vectors
     */
    generateEmbeddings(texts: string[]): Promise<(number[] | null)[]>;
    /**
     * Calculate cosine similarity between two embedding vectors
     * @param embedding1 First embedding vector
     * @param embedding2 Second embedding vector
     * @returns number Similarity score between -1 and 1
     */
    calculateSimilarity(embedding1: number[], embedding2: number[]): number;
    /**
     * Find the most similar embeddings to a query embedding
     * @param queryEmbedding The query embedding vector
     * @param candidateEmbeddings Array of candidate embedding vectors with metadata
     * @param topK Number of top results to return
     * @returns Array of results sorted by similarity (highest first)
     */
    findMostSimilar(queryEmbedding: number[], candidateEmbeddings: {
        embedding: number[];
        metadata: any;
    }[], topK?: number): {
        similarity: number;
        metadata: any;
    }[];
}
//# sourceMappingURL=embedding.service.d.ts.map