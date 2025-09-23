export interface EvaluationResult {
    overallScore: number;
    compliance: 'PASS' | 'FAIL' | 'WARNING';
    matchedPrinciples: MatchedPrinciple[];
    violations: Violation[];
    recommendations: string[];
    metadata: {
        evaluationTime: number;
        principlesEvaluated: number;
        tenantId?: number;
    };
}
export interface MatchedPrinciple {
    id: number;
    principle: string;
    category: string;
    similarity: number;
    compliance: 'PASS' | 'FAIL' | 'WARNING';
    score: number;
    reasoning: string;
}
export interface Violation {
    principleId: number;
    principle: string;
    category: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    description: string;
    suggestion: string;
}
export declare class EvaluationService {
    private prisma;
    private embeddingService;
    constructor();
    /**
     * Evaluate an action against constitutional principles
     * @param action The action to evaluate
     * @param tenantId Optional tenant ID for tenant-specific evaluation
     * @returns Promise<EvaluationResult>
     */
    evaluateAction(action: string, tenantId?: number): Promise<EvaluationResult>;
    /**
     * Get relevant principles for evaluation
     * @param actionEmbedding The embedding vector of the action
     * @param tenantId Optional tenant ID
     * @returns Promise<any[]> Array of relevant principles
     */
    private getRelevantPrinciples;
    /**
     * Evaluate an action against a specific principle
     * @param action The action to evaluate
     * @param principle The principle to evaluate against
     * @returns MatchedPrinciple
     */
    private evaluateAgainstPrinciple;
    /**
     * Check for explicit violations in the action text
     * @param action The action text
     * @param principle The principle text
     * @returns string[] Array of detected violations
     */
    private checkForViolations;
    /**
     * Apply category-specific evaluation rules
     * @param action The action text
     * @param category The principle category
     * @param baseScore The base score
     * @returns number Adjusted score
     */
    private applyCategoryRules;
    /**
     * Calculate overall compliance score
     * @param matchedPrinciples Array of matched principles
     * @returns number Overall score between 0 and 1
     */
    private calculateOverallScore;
    /**
     * Determine overall compliance status
     * @param overallScore The overall score
     * @param violations Array of violations
     * @returns 'PASS' | 'FAIL' | 'WARNING'
     */
    private determineCompliance;
    /**
     * Determine violation severity
     * @param score The principle score
     * @param similarity The similarity score
     * @returns 'HIGH' | 'MEDIUM' | 'LOW'
     */
    private determineSeverity;
    /**
     * Generate suggestions for violations
     * @param principle The violated principle
     * @param reasoning The violation reasoning
     * @returns string Suggestion text
     */
    private generateSuggestion;
    /**
     * Generate recommendations based on evaluation results
     * @param matchedPrinciples Array of matched principles
     * @param violations Array of violations
     * @returns string[] Array of recommendations
     */
    private generateRecommendations;
}
//# sourceMappingURL=evaluation.service.d.ts.map