"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvaluationService = void 0;
const client_1 = require("@prisma/client");
const embedding_service_1 = require("./embedding.service");
class EvaluationService {
    prisma;
    embeddingService;
    constructor() {
        this.prisma = new client_1.PrismaClient();
        this.embeddingService = new embedding_service_1.EmbeddingService();
    }
    /**
     * Evaluate an action against constitutional principles
     * @param action The action to evaluate
     * @param tenantId Optional tenant ID for tenant-specific evaluation
     * @returns Promise<EvaluationResult>
     */
    async evaluateAction(action, tenantId) {
        const startTime = Date.now();
        try {
            // Generate embedding for the action
            const actionEmbedding = await this.embeddingService.generateEmbedding(action);
            if (!actionEmbedding) {
                throw new Error('Failed to generate embedding for action');
            }
            // Get relevant principles
            const principles = await this.getRelevantPrinciples(actionEmbedding, tenantId);
            if (principles.length === 0) {
                return {
                    overallScore: 0.5,
                    compliance: 'WARNING',
                    matchedPrinciples: [],
                    violations: [],
                    recommendations: ['No constitutional principles found for evaluation. Consider adding relevant principles.'],
                    metadata: {
                        evaluationTime: Date.now() - startTime,
                        principlesEvaluated: 0,
                        tenantId
                    }
                };
            }
            // Evaluate against each principle
            const matchedPrinciples = [];
            const violations = [];
            for (const principle of principles) {
                const evaluation = await this.evaluateAgainstPrinciple(action, principle);
                matchedPrinciples.push(evaluation);
                if (evaluation.compliance === 'FAIL') {
                    violations.push({
                        principleId: principle.id,
                        principle: principle.principle,
                        category: principle.category,
                        severity: this.determineSeverity(evaluation.score, evaluation.similarity),
                        description: evaluation.reasoning,
                        suggestion: this.generateSuggestion(principle.principle, evaluation.reasoning)
                    });
                }
            }
            // Calculate overall score
            const overallScore = this.calculateOverallScore(matchedPrinciples);
            // Determine compliance status
            const compliance = this.determineCompliance(overallScore, violations);
            // Generate recommendations
            const recommendations = this.generateRecommendations(matchedPrinciples, violations);
            return {
                overallScore,
                compliance,
                matchedPrinciples,
                violations,
                recommendations,
                metadata: {
                    evaluationTime: Date.now() - startTime,
                    principlesEvaluated: principles.length,
                    tenantId
                }
            };
        }
        catch (error) {
            console.error('Error in evaluateAction:', error);
            throw error;
        }
    }
    /**
     * Get relevant principles for evaluation
     * @param actionEmbedding The embedding vector of the action
     * @param tenantId Optional tenant ID
     * @returns Promise<any[]> Array of relevant principles
     */
    async getRelevantPrinciples(actionEmbedding, tenantId) {
        const embeddingString = `[${actionEmbedding.join(',')}]`;
        if (tenantId) {
            // Get tenant-specific principles
            const results = await this.prisma.$queryRaw `
        SELECT 
          p.id, 
          p.principle, 
          p.category, 
          p.embedding,
          1 - (p.embedding <=> ${embeddingString}::vector) as similarity
        FROM principles p
        INNER JOIN tenant_principles tp ON p.id = tp.principle_id
        WHERE tp.tenant_id = ${tenantId}
          AND p.is_active = true 
          AND tp.is_active = true
          AND p.embedding IS NOT NULL
          AND 1 - (p.embedding <=> ${embeddingString}::vector) > 0.3
        ORDER BY similarity DESC 
        LIMIT 20
      `;
            return results;
        }
        else {
            // Get global principles
            const results = await this.prisma.$queryRaw `
        SELECT 
          id, 
          principle, 
          category, 
          embedding,
          1 - (embedding <=> ${embeddingString}::vector) as similarity
        FROM principles 
        WHERE is_active = true 
          AND embedding IS NOT NULL
          AND 1 - (embedding <=> ${embeddingString}::vector) > 0.3
        ORDER BY similarity DESC 
        LIMIT 20
      `;
            return results;
        }
    }
    /**
     * Evaluate an action against a specific principle
     * @param action The action to evaluate
     * @param principle The principle to evaluate against
     * @returns MatchedPrinciple
     */
    async evaluateAgainstPrinciple(action, principle) {
        // Simple rule-based evaluation logic
        // In a production system, this could use more sophisticated NLP or ML models
        const similarity = principle.similarity;
        let score = similarity;
        let compliance = 'PASS';
        let reasoning = '';
        // Check for explicit violations based on keywords and patterns
        const violations = this.checkForViolations(action, principle.principle);
        if (violations.length > 0) {
            score = Math.min(score, 0.3);
            compliance = 'FAIL';
            reasoning = `Potential violations detected: ${violations.join(', ')}`;
        }
        else if (similarity < 0.5) {
            compliance = 'WARNING';
            reasoning = 'Low similarity to constitutional principle - may require manual review';
        }
        else if (similarity < 0.7) {
            compliance = 'WARNING';
            reasoning = 'Moderate alignment with constitutional principle';
        }
        else {
            reasoning = 'Good alignment with constitutional principle';
        }
        // Apply category-specific evaluation rules
        score = this.applyCategoryRules(action, principle.category, score);
        return {
            id: principle.id,
            principle: principle.principle,
            category: principle.category,
            similarity,
            compliance,
            score,
            reasoning
        };
    }
    /**
     * Check for explicit violations in the action text
     * @param action The action text
     * @param principle The principle text
     * @returns string[] Array of detected violations
     */
    checkForViolations(action, principle) {
        const violations = [];
        const actionLower = action.toLowerCase();
        const principleLower = principle.toLowerCase();
        // Security-related violations
        if (principleLower.includes('security') || principleLower.includes('secure')) {
            if (actionLower.includes('disable security') ||
                actionLower.includes('bypass authentication') ||
                actionLower.includes('skip validation')) {
                violations.push('Security bypass detected');
            }
        }
        // Privacy-related violations
        if (principleLower.includes('privacy') || principleLower.includes('personal data')) {
            if (actionLower.includes('expose data') ||
                actionLower.includes('share personal information') ||
                actionLower.includes('log sensitive data')) {
                violations.push('Privacy violation detected');
            }
        }
        // Quality-related violations
        if (principleLower.includes('quality') || principleLower.includes('testing')) {
            if (actionLower.includes('skip tests') ||
                actionLower.includes('disable validation') ||
                actionLower.includes('ignore errors')) {
                violations.push('Quality standard violation detected');
            }
        }
        // Compliance-related violations
        if (principleLower.includes('compliance') || principleLower.includes('regulation')) {
            if (actionLower.includes('ignore compliance') ||
                actionLower.includes('bypass regulation') ||
                actionLower.includes('skip audit')) {
                violations.push('Compliance violation detected');
            }
        }
        return violations;
    }
    /**
     * Apply category-specific evaluation rules
     * @param action The action text
     * @param category The principle category
     * @param baseScore The base score
     * @returns number Adjusted score
     */
    applyCategoryRules(action, category, baseScore) {
        const categoryLower = category.toLowerCase();
        const actionLower = action.toLowerCase();
        // Security category - stricter evaluation
        if (categoryLower.includes('security')) {
            if (actionLower.includes('production') || actionLower.includes('live')) {
                return Math.min(baseScore, 0.9); // Cap at 0.9 for production security actions
            }
        }
        // Privacy category - stricter evaluation
        if (categoryLower.includes('privacy')) {
            if (actionLower.includes('user data') || actionLower.includes('personal')) {
                return Math.min(baseScore, 0.8); // Cap at 0.8 for privacy-related actions
            }
        }
        // Development category - more lenient
        if (categoryLower.includes('development') || categoryLower.includes('testing')) {
            return Math.min(baseScore * 1.1, 1.0); // Boost development actions slightly
        }
        return baseScore;
    }
    /**
     * Calculate overall compliance score
     * @param matchedPrinciples Array of matched principles
     * @returns number Overall score between 0 and 1
     */
    calculateOverallScore(matchedPrinciples) {
        if (matchedPrinciples.length === 0) {
            return 0.5; // Neutral score when no principles match
        }
        // Weight scores by similarity
        let weightedSum = 0;
        let totalWeight = 0;
        for (const principle of matchedPrinciples) {
            const weight = principle.similarity;
            weightedSum += principle.score * weight;
            totalWeight += weight;
        }
        return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
    }
    /**
     * Determine overall compliance status
     * @param overallScore The overall score
     * @param violations Array of violations
     * @returns 'PASS' | 'FAIL' | 'WARNING'
     */
    determineCompliance(overallScore, violations) {
        // Fail if there are high-severity violations
        if (violations.some(v => v.severity === 'HIGH')) {
            return 'FAIL';
        }
        // Fail if overall score is too low
        if (overallScore < 0.5) {
            return 'FAIL';
        }
        // Warning if there are violations or moderate score
        if (violations.length > 0 || overallScore < 0.7) {
            return 'WARNING';
        }
        return 'PASS';
    }
    /**
     * Determine violation severity
     * @param score The principle score
     * @param similarity The similarity score
     * @returns 'HIGH' | 'MEDIUM' | 'LOW'
     */
    determineSeverity(score, similarity) {
        if (score < 0.3 && similarity > 0.7) {
            return 'HIGH'; // High similarity but very low score
        }
        else if (score < 0.5) {
            return 'MEDIUM';
        }
        else {
            return 'LOW';
        }
    }
    /**
     * Generate suggestions for violations
     * @param principle The violated principle
     * @param reasoning The violation reasoning
     * @returns string Suggestion text
     */
    generateSuggestion(principle, reasoning) {
        const principleLower = principle.toLowerCase();
        if (principleLower.includes('security')) {
            return 'Consider implementing proper security measures, authentication, and authorization checks.';
        }
        else if (principleLower.includes('privacy')) {
            return 'Ensure proper data protection measures and user consent mechanisms are in place.';
        }
        else if (principleLower.includes('quality')) {
            return 'Implement comprehensive testing and quality assurance processes.';
        }
        else if (principleLower.includes('compliance')) {
            return 'Review relevant regulations and ensure all compliance requirements are met.';
        }
        else {
            return 'Review the action against the constitutional principle and make necessary adjustments.';
        }
    }
    /**
     * Generate recommendations based on evaluation results
     * @param matchedPrinciples Array of matched principles
     * @param violations Array of violations
     * @returns string[] Array of recommendations
     */
    generateRecommendations(matchedPrinciples, violations) {
        const recommendations = [];
        // Recommendations based on violations
        if (violations.length > 0) {
            const highSeverityViolations = violations.filter(v => v.severity === 'HIGH');
            if (highSeverityViolations.length > 0) {
                recommendations.push('Address high-severity violations immediately before proceeding.');
            }
            const categories = [...new Set(violations.map(v => v.category))];
            for (const category of categories) {
                recommendations.push(`Review and strengthen ${category.toLowerCase()} practices.`);
            }
        }
        // Recommendations based on low-scoring principles
        const lowScoringPrinciples = matchedPrinciples.filter(p => p.score < 0.6);
        if (lowScoringPrinciples.length > 0) {
            recommendations.push('Consider revising the action to better align with constitutional principles.');
        }
        // General recommendations
        if (matchedPrinciples.length < 3) {
            recommendations.push('Consider adding more specific constitutional principles for better evaluation coverage.');
        }
        if (recommendations.length === 0) {
            recommendations.push('Action appears to be in good compliance with constitutional principles.');
        }
        return recommendations;
    }
}
exports.EvaluationService = EvaluationService;
//# sourceMappingURL=evaluation.service.js.map