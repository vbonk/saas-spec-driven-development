# Constitution Service

The Constitution Service is the foundational component of the SaaS Architecture Spec-Kit (saasarch speckit) system. It establishes, maintains, and enforces the guiding principles (the "Constitution") of the platform, ensuring that all agents and services within the ecosystem adhere to predefined rules, standards, and architectural principles.

## Features

- **Constitutional Principle Management**: Create, update, and manage constitutional principles with vector embeddings for semantic search
- **Multi-Tenant Support**: Isolate principles and evaluations by tenant for enterprise use cases
- **AI-Powered Evaluation**: Evaluate actions against constitutional principles using OpenAI embeddings and similarity matching
- **Comprehensive API**: RESTful API with full CRUD operations for principles, tenants, and evaluations
- **Audit Logging**: Complete audit trail of all evaluations and compliance checks
- **Vector Search**: Semantic similarity search using PostgreSQL with pgvector extension

## Architecture

### Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL 14+ with pgvector extension
- **ORM**: Prisma
- **AI/ML**: OpenAI Embeddings API
- **Authentication**: JWT (configurable)

### Database Schema

The service uses four main entities:

1. **Principles**: Constitutional principles with vector embeddings
2. **Tenants**: Multi-tenant isolation for organizations
3. **TenantPrinciples**: Many-to-many relationship between tenants and principles
4. **EvaluationLogs**: Audit trail of all evaluations

## Installation

### Prerequisites

- Node.js 18 or higher
- PostgreSQL 14 or higher
- OpenAI API key

### Setup

1. **Clone and install dependencies**:
   ```bash
   cd services/constitution-service
   npm install
   ```

2. **Set up PostgreSQL with pgvector**:
   ```bash
   # Install PostgreSQL and pgvector extension
   sudo apt install postgresql postgresql-contrib
   git clone https://github.com/pgvector/pgvector.git
   cd pgvector && make && sudo make install
   
   # Create database
   sudo -u postgres createdb constitution_service
   sudo -u postgres psql -d constitution_service -c "CREATE EXTENSION vector;"
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run database migrations**:
   ```bash
   npm run db:migrate
   ```

5. **Seed initial data**:
   ```bash
   npm run db:seed
   ```

6. **Build and start the service**:
   ```bash
   npm run build
   npm start
   ```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `PORT` | Service port | 3001 |
| `NODE_ENV` | Environment (development/production) | development |
| `OPENAI_API_KEY` | OpenAI API key for embeddings | Required |
| `JWT_SECRET` | JWT signing secret | Required |
| `CORS_ORIGINS` | Allowed CORS origins | localhost:3000,localhost:3001 |

## API Documentation

### Base URL
```
http://localhost:3001/api/v1
```

### Health Check
```http
GET /health
```

### Principles

#### Get All Principles
```http
GET /principles?category=Security&active=true&limit=50&offset=0
```

#### Get Principle by ID
```http
GET /principles/{id}
```

#### Create Principle
```http
POST /principles
Content-Type: application/json

{
  "principle": "All user data must be encrypted at rest and in transit",
  "category": "Security"
}
```

#### Update Principle
```http
PUT /principles/{id}
Content-Type: application/json

{
  "principle": "Updated principle text",
  "category": "Security",
  "isActive": true
}
```

#### Search Principles
```http
POST /principles/search
Content-Type: application/json

{
  "query": "user authentication security",
  "limit": 10,
  "threshold": 0.7
}
```

### Tenants

#### Get All Tenants
```http
GET /tenants?active=true&limit=50&offset=0
```

#### Get Tenant by ID
```http
GET /tenants/{id}
```

#### Get Tenant by Slug
```http
GET /tenants/slug/{slug}
```

#### Create Tenant
```http
POST /tenants
Content-Type: application/json

{
  "name": "My Organization",
  "slug": "my-org"
}
```

#### Assign Principles to Tenant
```http
POST /tenants/{id}/principles
Content-Type: application/json

{
  "principleIds": [1, 2, 3]
}
```

### Evaluations

#### Evaluate Action
```http
POST /evaluate
Content-Type: application/json

{
  "action": "Store user passwords in plain text database",
  "tenantId": 1,
  "metadata": {
    "source": "code-review",
    "reviewer": "ai-agent"
  }
}
```

#### Batch Evaluation
```http
POST /evaluate/batch
Content-Type: application/json

{
  "actions": [
    "Implement JWT authentication",
    "Store passwords in plain text",
    "Skip input validation"
  ],
  "tenantId": 1
}
```

#### Get Evaluation Logs
```http
GET /evaluate/logs?tenantId=1&limit=50&offset=0&minScore=0.5
```

#### Get Evaluation Statistics
```http
GET /evaluate/stats?tenantId=1&days=30
```

## Usage Examples

### Basic Principle Management

```javascript
// Create a new security principle
const response = await fetch('/api/v1/principles', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    principle: 'All API endpoints must implement rate limiting',
    category: 'Security'
  })
});

const principle = await response.json();
console.log('Created principle:', principle.data);
```

### Action Evaluation

```javascript
// Evaluate a development action
const evaluation = await fetch('/api/v1/evaluate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'Deploy code directly to production without testing',
    tenantId: 1
  })
});

const result = await evaluation.json();
console.log('Evaluation result:', result.data);
// Expected: { compliance: 'FAIL', overallScore: 0.2, violations: [...] }
```

### Semantic Search

```javascript
// Search for security-related principles
const search = await fetch('/api/v1/principles/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'password encryption authentication',
    limit: 5,
    threshold: 0.6
  })
});

const results = await search.json();
console.log('Matching principles:', results.data);
```

## Integration with Agents

The Constitution Service is designed to integrate seamlessly with other agents in the saasarch speckit ecosystem:

### Agent Builder Integration

```javascript
// Example: Agent Builder checking constitutional compliance
const agentCode = `
  function createUser(userData) {
    // Store user data without encryption
    return database.save(userData);
  }
`;

const evaluation = await constitutionService.evaluate({
  action: `Creating user storage function: ${agentCode}`,
  tenantId: 'agent-builder'
});

if (evaluation.compliance === 'FAIL') {
  throw new Error(`Code violates constitutional principles: ${evaluation.violations}`);
}
```

### UI Architect Integration

```javascript
// Example: UI Architect ensuring accessibility compliance
const uiComponent = `
  <button onclick="submitForm()">Submit</button>
`;

const evaluation = await constitutionService.evaluate({
  action: `Creating UI component: ${uiComponent}`,
  tenantId: 'ui-architect'
});

// Check for accessibility violations
const accessibilityViolations = evaluation.violations.filter(
  v => v.category === 'Accessibility'
);
```

## Development

### Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run db:migrate` - Run database migrations
- `npm run db:generate` - Generate Prisma client
- `npm run db:seed` - Seed database with initial data
- `npm run type-check` - Run TypeScript type checking

### Testing

```bash
# Run tests (when implemented)
npm test

# Run type checking
npm run type-check

# Run linting (when configured)
npm run lint
```

## Deployment

### Production Deployment

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Set production environment variables**:
   ```bash
   export NODE_ENV=production
   export DATABASE_URL="postgresql://user:pass@host:5432/constitution_service"
   export OPENAI_API_KEY="your-openai-api-key"
   export JWT_SECRET="your-secure-jwt-secret"
   ```

3. **Run database migrations**:
   ```bash
   npm run db:migrate
   ```

4. **Start the service**:
   ```bash
   npm start
   ```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
COPY prisma ./prisma
EXPOSE 3001
CMD ["npm", "start"]
```

## Monitoring and Observability

The service provides comprehensive logging and monitoring capabilities:

- **Health Check Endpoint**: `/health` for load balancer health checks
- **Structured Logging**: JSON-formatted logs with correlation IDs
- **Metrics**: Evaluation counts, response times, and error rates
- **Audit Trail**: Complete history of all evaluations and changes

## Security Considerations

- **Input Validation**: All inputs are validated and sanitized
- **SQL Injection Protection**: Parameterized queries via Prisma
- **Rate Limiting**: Configurable rate limiting on all endpoints
- **CORS Configuration**: Configurable CORS origins
- **JWT Authentication**: Secure token-based authentication
- **Sensitive Data Protection**: No sensitive data in logs or responses

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run type checking and tests
6. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Check the documentation in `/docs`
- Review the API examples above

---

**Constitution Service** - Ensuring constitutional compliance in AI-driven development workflows.
