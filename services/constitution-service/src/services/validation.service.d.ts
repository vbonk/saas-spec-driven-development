export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}
export interface PrincipleInput {
    principle: string;
    category: string;
}
export interface TenantInput {
    name: string;
    slug: string;
}
export interface EvaluationInput {
    action: string;
    tenantId?: number;
    metadata?: any;
}
export declare class ValidationService {
    /**
     * Validate principle input data
     * @param input The principle input to validate
     * @returns ValidationResult
     */
    validatePrinciple(input: PrincipleInput): ValidationResult;
    /**
     * Validate tenant input data
     * @param input The tenant input to validate
     * @returns ValidationResult
     */
    validateTenant(input: TenantInput): ValidationResult;
    /**
     * Validate evaluation input data
     * @param input The evaluation input to validate
     * @returns ValidationResult
     */
    validateEvaluation(input: EvaluationInput): ValidationResult;
    /**
     * Validate search query input
     * @param query The search query to validate
     * @param limit The limit parameter to validate
     * @param threshold The threshold parameter to validate
     * @returns ValidationResult
     */
    validateSearchQuery(query: string, limit?: number, threshold?: number): ValidationResult;
    /**
     * Sanitize string input by trimming whitespace and removing potentially harmful characters
     * @param input The string to sanitize
     * @returns Sanitized string
     */
    sanitizeString(input: string): string;
    /**
     * Sanitize slug input by converting to lowercase and replacing invalid characters
     * @param input The slug to sanitize
     * @returns Sanitized slug
     */
    sanitizeSlug(input: string): string;
    /**
     * Check if a string contains potentially harmful content
     * @param input The string to check
     * @returns boolean True if content appears safe
     */
    isSafeContent(input: string): boolean;
}
//# sourceMappingURL=validation.service.d.ts.map