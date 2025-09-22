# CLAUDE.md - SaaS Spec-Driven Development Guidance

## Project Overview

The **SaaS Spec-Driven Development** repository implements comprehensive specification-driven development processes for SaaS applications, providing structured approaches to requirements management, specification creation, and development workflow coordination across the entire ecosystem.

## 🎯 Repository Purpose

### Core Mission
Transform chaotic development into **structured, AI-enhanced specification-first workflows** that ensure quality, consistency, and seamless coordination across multiple repositories and teams.

### Key Capabilities
- **Requirements Management**: Automated gathering, validation, and tracking
- **Specification Creation**: AI-assisted technical specification generation
- **Development Coordination**: Cross-repository workflow management
- **Quality Assurance**: Automated validation and compliance checking
- **Documentation Automation**: Self-maintaining documentation systems

## 🏗️ Architecture Integration

### Ecosystem Position
Part of Tony's integrated SaaS development ecosystem:
```
saas-ecosystem-architecture  ← Primary schema and admin interface
     ↓ (extends schema)
app-agents                   ← AI agent implementations  
     ↓ (coordinates with)
saas-spec-driven-development ← This repository - specifications and workflows
```

### Database Architecture
```prisma
// Extends saas-ecosystem-architecture primary schema
// Focus: Specification and workflow management

model Specification {
  id              String                @id @default(cuid())
  title           String
  type            SpecificationType     // FUNCTIONAL, TECHNICAL, API, etc.
  status          SpecificationStatus   // DRAFT, REVIEW, APPROVED, PUBLISHED
  content         Json                  // Structured specification content
  requirements    Requirement[]         // Associated requirements
  implementations Implementation[]      // Development implementations
  validations     SpecValidation[]      // AI-powered validation results
}
```

### AI Agent Integration
```typescript
// Specification agents coordinate with app-agents framework
import { SpecAgent } from '@/lib/agents';

const requirementsAnalyzer = new SpecAgent({
  type: 'REQUIREMENTS_ANALYZER',
  capabilities: ['extract', 'validate', 'structure'],
  database: sharedPostgresConnection
});

await requirementsAnalyzer.analyzeRequirements(rawInput);
```

## 🚀 Development Workflow

### 1. Specification-First Development Process

#### Requirements Gathering
```typescript
// AI-assisted requirements extraction
const requirements = await requirementsAnalyzer.extractFromSources({
  sources: ['user_stories', 'business_docs', 'existing_code'],
  validation: 'comprehensive',
  structuredOutput: true
});
```

#### Specification Generation
```typescript
// Automated specification creation
const specification = await specGenerator.createSpecification({
  requirements: requirements,
  type: 'TECHNICAL',
  standards: 'enterprise',
  crossRepoAlignment: true
});
```

#### Validation and Quality Assurance
```typescript
// Multi-layer validation
const validation = await qualityValidator.validateSpecification({
  spec: specification,
  checks: ['completeness', 'consistency', 'feasibility', 'compliance'],
  aiAssisted: true
});
```

### 2. Cross-Repository Coordination

#### Schema Synchronization
```bash
# Ensure alignment across all repositories
npm run validate:alignment    # Cross-repository validation
npm run sync:schemas         # Synchronize database schemas
npm run deploy:coordinated   # Coordinated deployment
```

#### Development Orchestration
```typescript
// Coordinate development across repositories
const coordinator = new DeploymentCoordinator({
  repositories: ['saas-ecosystem-architecture', 'app-agents', 'saas-spec-driven-development'],
  strategy: 'SEQUENTIAL',
  environment: 'staging'
});

await coordinator.executeCoordinatedDeployment();
```

## 🔧 Technology Stack

### Frontend Framework
- **Next.js 14+**: App Router with TypeScript
- **TailwindCSS**: Styling with ShadCN UI components
- **React Hook Form**: Form management with Zod validation

### Backend Infrastructure
- **PostgreSQL**: Primary database with pgvector extension
- **Prisma ORM**: Type-safe database access
- **NextAuth.js**: Authentication and session management

### AI Integration
- **Multi-Provider LLM**: OpenAI, Anthropic, Google AI support
- **Agent Framework**: Integration with app-agents repository
- **Automated Validation**: AI-powered quality assurance

### Development Tools
- **TypeScript**: Strict type safety
- **ESLint + Prettier**: Code quality and formatting
- **Jest**: Comprehensive testing framework
- **GitHub Actions**: CI/CD and automation

## 🎯 Key Features

### Specification Management
```typescript
// Complete specification lifecycle
class SpecificationManager {
  async createSpecification(requirements: Requirement[]): Promise<Specification> {
    // AI-assisted specification generation
    const draft = await this.generateFromRequirements(requirements);
    
    // Automated validation
    const validation = await this.validateSpecification(draft);
    
    // Cross-repository impact analysis
    const impact = await this.analyzeImpact(draft);
    
    return this.createWithValidation(draft, validation, impact);
  }
}
```

### Requirements Validation
```typescript
// AI-powered requirements analysis
class RequirementsValidator {
  async validateRequirements(requirements: Requirement[]): Promise<ValidationResult> {
    return {
      completeness: await this.checkCompleteness(requirements),
      consistency: await this.checkConsistency(requirements),
      feasibility: await this.assessFeasibility(requirements),
      dependencies: await this.analyzeDependencies(requirements)
    };
  }
}
```

### Development Coordination
```typescript
// Cross-repository development management
class DevelopmentCoordinator {
  async coordinateImplementation(spec: Specification): Promise<Implementation[]> {
    // Analyze cross-repository impact
    const impact = await this.analyzeRepositoryImpact(spec);
    
    // Create coordinated implementation plan
    const plan = await this.createImplementationPlan(impact);
    
    // Execute with validation
    return this.executeWithValidation(plan);
  }
}
```

## 📊 Quality Standards

### Specification Quality Metrics
- **Completeness**: >95% requirement coverage
- **Consistency**: 100% internal consistency
- **Feasibility**: Technical implementation viability
- **Compliance**: Standards and security adherence

### Performance Requirements
- **Specification Generation**: <30 seconds
- **Validation Processing**: <10 seconds
- **Cross-Repository Sync**: <5 minutes
- **Documentation Updates**: Real-time

### Testing Standards
```bash
# Comprehensive testing requirements
npm run test              # Unit tests (>90% coverage)
npm run test:integration  # Integration tests
npm run test:e2e         # End-to-end validation
npm run test:performance # Performance benchmarking
```

## 🔐 Security and Compliance

### Data Protection
```typescript
// Secure specification handling
class SecureSpecificationManager {
  async storeSpecification(spec: Specification): Promise<void> {
    // Encrypt sensitive content
    const encrypted = await this.encryptSensitiveContent(spec);
    
    // Multi-tenant isolation
    const isolated = await this.applyTenantIsolation(encrypted);
    
    // Audit trail
    await this.createAuditEntry(isolated);
    
    return this.storeSecurely(isolated);
  }
}
```

### Access Control
- **Role-Based Access**: Specification access based on user roles
- **Multi-Tenant Security**: Organization-level data isolation
- **Audit Logging**: Comprehensive activity tracking
- **Compliance Validation**: Automated compliance checking

## 🛠️ Development Setup

### Installation
```bash
# Clone and setup
git clone <repository-url>
cd saas-spec-driven-development
npm install

# Environment configuration
cp .env.example .env.local
# Edit .env.local with your configuration

# Database setup
npx prisma generate
npx prisma db push

# Start development server
npm run dev  # Runs on http://localhost:3002
```

### Environment Variables
```bash
# Database connection (shared with ecosystem)
DATABASE_URL="postgresql://user:pass@localhost:5432/saas_spec_driven_dev"

# Authentication
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3002"

# AI Providers
OPENAI_API_KEY="your-openai-key"
ANTHROPIC_API_KEY="your-anthropic-key"

# Cross-repository coordination
SAAS_ECOSYSTEM_URL="http://localhost:3000"
APP_AGENTS_URL="http://localhost:3001"
```

## 🔄 Cross-Repository Workflows

### Coordinated Development
1. **Specification Creation**: Define requirements and technical specs
2. **Impact Analysis**: Analyze cross-repository implications
3. **Implementation Planning**: Create coordinated development plan
4. **Execution**: Implement across all affected repositories
5. **Validation**: Ensure specification compliance
6. **Deployment**: Coordinated deployment across ecosystem

### Schema Coordination
```bash
# Schema update workflow
cd saas-ecosystem-architecture/admin-app
npx prisma db push  # Update primary schema

cd ../../saas-spec-driven-development
npm run sync:schemas  # Sync specification extensions

cd ../app-agents
python scripts/validate_cross_repo_alignment.py  # Validate alignment
```

## 📚 Key Resources

### Essential Documentation
- **`/manus/README.md`**: Research and specification documentation
- **`/docs/`**: Comprehensive development guides
- **`/prisma/schema.prisma`**: Database schema definitions
- **`/scripts/`**: Automation and coordination scripts

### Integration Guides
- **Cross-Repository Coordination**: Multi-repo development processes
- **AI Agent Integration**: Specification agent implementation
- **Quality Assurance**: Validation and compliance procedures
- **Deployment Coordination**: Multi-repo deployment strategies

## 🚨 Critical Requirements

### NEVER Do These
- ❌ Create specifications without AI validation
- ❌ Deploy without cross-repository coordination
- ❌ Modify schemas without ecosystem alignment
- ❌ Skip specification-first development process
- ❌ Store sensitive data without encryption

### ALWAYS Do These
- ✅ Use AI-assisted specification creation
- ✅ Validate cross-repository impact before changes
- ✅ Follow specification-first development workflow
- ✅ Implement comprehensive testing and validation
- ✅ Coordinate deployments across all repositories

## 🎯 Development Priorities

### Current Focus
1. **AI Agent Integration**: Seamless coordination with app-agents
2. **Cross-Repository Validation**: Automated alignment checking
3. **Specification Quality**: AI-powered validation and improvement
4. **Documentation Automation**: Self-maintaining documentation

### Strategic Goals
1. **Universal Spec-First Workflow**: All development follows specification-first process
2. **AI-Enhanced Quality**: Comprehensive AI-powered quality assurance
3. **Ecosystem Integration**: Deep integration across all repositories
4. **Enterprise Features**: Advanced security, compliance, and governance

---

This repository ensures that all SaaS development follows structured, validated, and coordinated processes, eliminating chaos and ensuring enterprise-grade quality across the entire ecosystem.

*Last updated: 2025-01-21 - Automatically maintained*