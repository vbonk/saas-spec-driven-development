import { PrismaClient } from '@prisma/client';
import { EmbeddingService } from '../src/services/embedding.service';

const prisma = new PrismaClient();
const embeddingService = new EmbeddingService();

const defaultPrinciples = [
  {
    principle: "All user data must be encrypted at rest and in transit using industry-standard encryption algorithms.",
    category: "Security"
  },
  {
    principle: "User authentication must be implemented using secure methods such as OAuth 2.0, JWT tokens, or multi-factor authentication.",
    category: "Security"
  },
  {
    principle: "Personal data collection must be minimized and only collected with explicit user consent.",
    category: "Privacy"
  },
  {
    principle: "Users must have the right to access, modify, and delete their personal data at any time.",
    category: "Privacy"
  },
  {
    principle: "All code must be thoroughly tested with unit tests, integration tests, and end-to-end tests before deployment.",
    category: "Quality"
  },
  {
    principle: "Code must follow established coding standards and be reviewed by at least one other developer before merging.",
    category: "Quality"
  },
  {
    principle: "All API endpoints must implement proper input validation and sanitization to prevent injection attacks.",
    category: "Security"
  },
  {
    principle: "Error messages must not expose sensitive information or system internals to end users.",
    category: "Security"
  },
  {
    principle: "All database queries must use parameterized statements to prevent SQL injection attacks.",
    category: "Security"
  },
  {
    principle: "User sessions must have appropriate timeout periods and be invalidated upon logout.",
    category: "Security"
  },
  {
    principle: "All third-party dependencies must be regularly updated and scanned for known vulnerabilities.",
    category: "Security"
  },
  {
    principle: "Data retention policies must be clearly defined and automatically enforced.",
    category: "Privacy"
  },
  {
    principle: "All user actions that modify data must be logged for audit purposes.",
    category: "Compliance"
  },
  {
    principle: "System performance must be monitored and optimized to maintain acceptable response times.",
    category: "Performance"
  },
  {
    principle: "All deployments must go through a staging environment before being deployed to production.",
    category: "Quality"
  },
  {
    principle: "Database backups must be performed regularly and tested for integrity.",
    category: "Reliability"
  },
  {
    principle: "All external API integrations must implement proper error handling and retry mechanisms.",
    category: "Reliability"
  },
  {
    principle: "User interfaces must be accessible and comply with WCAG 2.1 AA standards.",
    category: "Accessibility"
  },
  {
    principle: "All configuration and secrets must be stored securely and not hardcoded in the application.",
    category: "Security"
  },
  {
    principle: "Rate limiting must be implemented on all public API endpoints to prevent abuse.",
    category: "Security"
  }
];

const defaultTenants = [
  {
    name: "Default Organization",
    slug: "default"
  },
  {
    name: "Development Team",
    slug: "dev-team"
  },
  {
    name: "Security Team",
    slug: "security-team"
  }
];

async function main() {
  console.log('Starting database seed...');

  try {
    // Create default tenants
    console.log('Creating default tenants...');
    const createdTenants = [];
    
    for (const tenantData of defaultTenants) {
      const tenant = await prisma.tenant.upsert({
        where: { slug: tenantData.slug },
        update: {},
        create: tenantData
      });
      createdTenants.push(tenant);
      console.log(`Created tenant: ${tenant.name} (${tenant.slug})`);
    }

    // Create default principles with embeddings
    console.log('Creating default principles with embeddings...');
    const createdPrinciples = [];

    for (const principleData of defaultPrinciples) {
      console.log(`Generating embedding for principle: ${principleData.principle.substring(0, 50)}...`);
      
      // Generate embedding
      const embedding = await embeddingService.generateEmbedding(principleData.principle);
      const embeddingString = embedding ? `[${embedding.join(',')}]` : null;

      const principle = await prisma.principle.create({
        data: {
          principle: principleData.principle,
          category: principleData.category
        }
      });

      // Update with embedding using raw SQL if embedding was generated
      if (embeddingString) {
        await prisma.$executeRaw`
          UPDATE principles 
          SET embedding = ${embeddingString}::vector 
          WHERE id = ${principle.id}
        `;
      }
      
      createdPrinciples.push(principle);
      console.log(`Created principle: ${principle.id} - ${principle.category}`);
    }

    // Assign all principles to the default tenant
    console.log('Assigning principles to default tenant...');
    const defaultTenant = createdTenants.find(t => t.slug === 'default');
    
    if (defaultTenant) {
      for (const principle of createdPrinciples) {
        await prisma.tenantPrinciple.create({
          data: {
            tenantId: defaultTenant.id,
            principleId: principle.id,
            isActive: true
          }
        });
      }
      console.log(`Assigned ${createdPrinciples.length} principles to default tenant`);
    }

    // Assign security principles to security team
    console.log('Assigning security principles to security team...');
    const securityTenant = createdTenants.find(t => t.slug === 'security-team');
    const securityPrinciples = createdPrinciples.filter(p => p.category === 'Security');
    
    if (securityTenant) {
      for (const principle of securityPrinciples) {
        await prisma.tenantPrinciple.create({
          data: {
            tenantId: securityTenant.id,
            principleId: principle.id,
            isActive: true
          }
        });
      }
      console.log(`Assigned ${securityPrinciples.length} security principles to security team`);
    }

    // Create some sample evaluation logs
    console.log('Creating sample evaluation logs...');
    const sampleActions = [
      "Implement user authentication using JWT tokens",
      "Store user passwords in plain text",
      "Deploy code directly to production without testing",
      "Encrypt sensitive user data before storing in database",
      "Log user passwords for debugging purposes"
    ];

    for (const action of sampleActions) {
      await prisma.evaluationLog.create({
        data: {
          tenantId: defaultTenant?.id || null,
          action,
          result: JSON.stringify({
            overallScore: Math.random(),
            compliance: Math.random() > 0.5 ? 'PASS' : 'FAIL',
            matchedPrinciples: [],
            violations: [],
            recommendations: []
          }),
          score: Math.random(),
          metadata: {
            seedData: true,
            timestamp: new Date().toISOString()
          }
        }
      });
    }

    console.log('Database seed completed successfully!');
    console.log(`Created ${createdTenants.length} tenants`);
    console.log(`Created ${createdPrinciples.length} principles`);
    console.log(`Created ${sampleActions.length} sample evaluation logs`);

  } catch (error) {
    console.error('Error during database seed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
