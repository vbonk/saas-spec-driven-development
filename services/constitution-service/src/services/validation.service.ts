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

export class ValidationService {
  
  /**
   * Validate principle input data
   * @param input The principle input to validate
   * @returns ValidationResult
   */
  validatePrinciple(input: PrincipleInput): ValidationResult {
    const errors: string[] = [];

    // Validate principle text
    if (!input.principle || typeof input.principle !== 'string') {
      errors.push('Principle text is required and must be a string');
    } else {
      const trimmedPrinciple = input.principle.trim();
      if (trimmedPrinciple.length === 0) {
        errors.push('Principle text cannot be empty');
      } else if (trimmedPrinciple.length < 10) {
        errors.push('Principle text must be at least 10 characters long');
      } else if (trimmedPrinciple.length > 5000) {
        errors.push('Principle text cannot exceed 5000 characters');
      }
    }

    // Validate category
    if (!input.category || typeof input.category !== 'string') {
      errors.push('Category is required and must be a string');
    } else {
      const trimmedCategory = input.category.trim();
      if (trimmedCategory.length === 0) {
        errors.push('Category cannot be empty');
      } else if (trimmedCategory.length > 255) {
        errors.push('Category cannot exceed 255 characters');
      } else if (!/^[a-zA-Z0-9_\-\s]+$/.test(trimmedCategory)) {
        errors.push('Category can only contain letters, numbers, spaces, hyphens, and underscores');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate tenant input data
   * @param input The tenant input to validate
   * @returns ValidationResult
   */
  validateTenant(input: TenantInput): ValidationResult {
    const errors: string[] = [];

    // Validate name
    if (!input.name || typeof input.name !== 'string') {
      errors.push('Tenant name is required and must be a string');
    } else {
      const trimmedName = input.name.trim();
      if (trimmedName.length === 0) {
        errors.push('Tenant name cannot be empty');
      } else if (trimmedName.length < 2) {
        errors.push('Tenant name must be at least 2 characters long');
      } else if (trimmedName.length > 255) {
        errors.push('Tenant name cannot exceed 255 characters');
      }
    }

    // Validate slug
    if (!input.slug || typeof input.slug !== 'string') {
      errors.push('Tenant slug is required and must be a string');
    } else {
      const trimmedSlug = input.slug.trim();
      if (trimmedSlug.length === 0) {
        errors.push('Tenant slug cannot be empty');
      } else if (trimmedSlug.length < 2) {
        errors.push('Tenant slug must be at least 2 characters long');
      } else if (trimmedSlug.length > 100) {
        errors.push('Tenant slug cannot exceed 100 characters');
      } else if (!/^[a-z0-9\-]+$/.test(trimmedSlug)) {
        errors.push('Tenant slug can only contain lowercase letters, numbers, and hyphens');
      } else if (trimmedSlug.startsWith('-') || trimmedSlug.endsWith('-')) {
        errors.push('Tenant slug cannot start or end with a hyphen');
      } else if (trimmedSlug.includes('--')) {
        errors.push('Tenant slug cannot contain consecutive hyphens');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate evaluation input data
   * @param input The evaluation input to validate
   * @returns ValidationResult
   */
  validateEvaluation(input: EvaluationInput): ValidationResult {
    const errors: string[] = [];

    // Validate action
    if (!input.action || typeof input.action !== 'string') {
      errors.push('Action is required and must be a string');
    } else {
      const trimmedAction = input.action.trim();
      if (trimmedAction.length === 0) {
        errors.push('Action cannot be empty');
      } else if (trimmedAction.length > 10000) {
        errors.push('Action cannot exceed 10000 characters');
      }
    }

    // Validate tenantId if provided
    if (input.tenantId !== undefined) {
      if (!Number.isInteger(input.tenantId) || input.tenantId <= 0) {
        errors.push('Tenant ID must be a positive integer');
      }
    }

    // Validate metadata if provided
    if (input.metadata !== undefined) {
      try {
        JSON.stringify(input.metadata);
      } catch (error) {
        errors.push('Metadata must be a valid JSON object');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate search query input
   * @param query The search query to validate
   * @param limit The limit parameter to validate
   * @param threshold The threshold parameter to validate
   * @returns ValidationResult
   */
  validateSearchQuery(query: string, limit?: number, threshold?: number): ValidationResult {
    const errors: string[] = [];

    // Validate query
    if (!query || typeof query !== 'string') {
      errors.push('Query is required and must be a string');
    } else {
      const trimmedQuery = query.trim();
      if (trimmedQuery.length === 0) {
        errors.push('Query cannot be empty');
      } else if (trimmedQuery.length > 1000) {
        errors.push('Query cannot exceed 1000 characters');
      }
    }

    // Validate limit if provided
    if (limit !== undefined) {
      if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
        errors.push('Limit must be a positive integer between 1 and 100');
      }
    }

    // Validate threshold if provided
    if (threshold !== undefined) {
      if (typeof threshold !== 'number' || threshold < 0 || threshold > 1) {
        errors.push('Threshold must be a number between 0 and 1');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitize string input by trimming whitespace and removing potentially harmful characters
   * @param input The string to sanitize
   * @returns Sanitized string
   */
  sanitizeString(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    return input
      .trim()
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  /**
   * Sanitize slug input by converting to lowercase and replacing invalid characters
   * @param input The slug to sanitize
   * @returns Sanitized slug
   */
  sanitizeSlug(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    return input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\-]/g, '-') // Replace invalid characters with hyphens
      .replace(/-+/g, '-') // Replace multiple consecutive hyphens with single hyphen
      .replace(/^-+|-+$/g, ''); // Remove leading and trailing hyphens
  }

  /**
   * Check if a string contains potentially harmful content
   * @param input The string to check
   * @returns boolean True if content appears safe
   */
  isSafeContent(input: string): boolean {
    if (typeof input !== 'string') {
      return false;
    }

    // Check for common injection patterns
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /data:text\/html/i,
      /vbscript:/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /<link/i,
      /<meta/i
    ];

    return !dangerousPatterns.some(pattern => pattern.test(input));
  }
}
