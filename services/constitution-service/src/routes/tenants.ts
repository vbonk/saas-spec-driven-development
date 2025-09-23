import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { ValidationService } from '../services/validation.service';

const router = Router();
const prisma = new PrismaClient();
const validationService = new ValidationService();

// GET /api/v1/tenants - Get all tenants
router.get('/', async (req, res) => {
  try {
    const { active, limit = 50, offset = 0 } = req.query;
    
    const where: any = {};
    if (active !== undefined) where.isActive = active === 'true';

    const tenants = await prisma.tenant.findMany({
      where,
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            tenantPrinciples: true,
            evaluationLogs: true
          }
        }
      }
    });

    const total = await prisma.tenant.count({ where });

    res.json({
      data: tenants,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

// GET /api/v1/tenants/:id - Get a specific tenant
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const tenant = await prisma.tenant.findUnique({
      where: { id: parseInt(id) },
      include: {
        tenantPrinciples: {
          include: {
            principle: true
          },
          where: {
            isActive: true
          }
        },
        evaluationLogs: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            tenantPrinciples: true,
            evaluationLogs: true
          }
        }
      }
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json({ data: tenant });
  } catch (error) {
    console.error('Error fetching tenant:', error);
    res.status(500).json({ error: 'Failed to fetch tenant' });
  }
});

// GET /api/v1/tenants/slug/:slug - Get tenant by slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      include: {
        tenantPrinciples: {
          include: {
            principle: true
          },
          where: {
            isActive: true
          }
        },
        _count: {
          select: {
            tenantPrinciples: true,
            evaluationLogs: true
          }
        }
      }
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json({ data: tenant });
  } catch (error) {
    console.error('Error fetching tenant by slug:', error);
    res.status(500).json({ error: 'Failed to fetch tenant' });
  }
});

// POST /api/v1/tenants - Create a new tenant
router.post('/', async (req, res) => {
  try {
    const { name, slug } = req.body;

    // Validate input
    const validation = validationService.validateTenant({ name, slug });
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.errors });
    }

    // Sanitize input
    const sanitizedName = validationService.sanitizeString(name);
    const sanitizedSlug = validationService.sanitizeSlug(slug);

    // Check if slug already exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: sanitizedSlug }
    });

    if (existingTenant) {
      return res.status(409).json({ error: 'Tenant with this slug already exists' });
    }

    const newTenant = await prisma.tenant.create({
      data: {
        name: sanitizedName,
        slug: sanitizedSlug
      }
    });

    res.status(201).json({ data: newTenant });
  } catch (error) {
    console.error('Error creating tenant:', error);
    res.status(500).json({ error: 'Failed to create tenant' });
  }
});

// PUT /api/v1/tenants/:id - Update a tenant
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, isActive } = req.body;

    // Check if tenant exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingTenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Validate input if provided
    if (name || slug) {
      const validation = validationService.validateTenant({ 
        name: name || existingTenant.name, 
        slug: slug || existingTenant.slug 
      });
      if (!validation.isValid) {
        return res.status(400).json({ error: validation.errors });
      }
    }

    const updateData: any = {};
    if (name) updateData.name = validationService.sanitizeString(name);
    if (slug) {
      const sanitizedSlug = validationService.sanitizeSlug(slug);
      
      // Check if new slug already exists (excluding current tenant)
      if (sanitizedSlug !== existingTenant.slug) {
        const slugExists = await prisma.tenant.findUnique({
          where: { slug: sanitizedSlug }
        });
        
        if (slugExists) {
          return res.status(409).json({ error: 'Tenant with this slug already exists' });
        }
        
        updateData.slug = sanitizedSlug;
      }
    }
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedTenant = await prisma.tenant.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    res.json({ data: updatedTenant });
  } catch (error) {
    console.error('Error updating tenant:', error);
    res.status(500).json({ error: 'Failed to update tenant' });
  }
});

// DELETE /api/v1/tenants/:id - Deactivate a tenant
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const tenant = await prisma.tenant.findUnique({
      where: { id: parseInt(id) }
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const deactivatedTenant = await prisma.tenant.update({
      where: { id: parseInt(id) },
      data: { isActive: false }
    });

    res.json({ data: deactivatedTenant });
  } catch (error) {
    console.error('Error deactivating tenant:', error);
    res.status(500).json({ error: 'Failed to deactivate tenant' });
  }
});

// POST /api/v1/tenants/:id/principles - Assign principles to a tenant
router.post('/:id/principles', async (req, res) => {
  try {
    const { id } = req.params;
    const { principleIds } = req.body;

    if (!Array.isArray(principleIds) || principleIds.length === 0) {
      return res.status(400).json({ error: 'principleIds must be a non-empty array' });
    }

    // Check if tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: parseInt(id) }
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Check if all principles exist
    const principles = await prisma.principle.findMany({
      where: { 
        id: { in: principleIds },
        isActive: true
      }
    });

    if (principles.length !== principleIds.length) {
      return res.status(400).json({ error: 'One or more principles not found or inactive' });
    }

    // Create tenant-principle associations
    const tenantPrinciples = await Promise.all(
      principleIds.map(async (principleId: number) => {
        return prisma.tenantPrinciple.upsert({
          where: {
            tenantId_principleId: {
              tenantId: parseInt(id),
              principleId
            }
          },
          update: {
            isActive: true
          },
          create: {
            tenantId: parseInt(id),
            principleId,
            isActive: true
          }
        });
      })
    );

    res.status(201).json({ data: tenantPrinciples });
  } catch (error) {
    console.error('Error assigning principles to tenant:', error);
    res.status(500).json({ error: 'Failed to assign principles to tenant' });
  }
});

// DELETE /api/v1/tenants/:id/principles/:principleId - Remove principle from tenant
router.delete('/:id/principles/:principleId', async (req, res) => {
  try {
    const { id, principleId } = req.params;

    const tenantPrinciple = await prisma.tenantPrinciple.findUnique({
      where: {
        tenantId_principleId: {
          tenantId: parseInt(id),
          principleId: parseInt(principleId)
        }
      }
    });

    if (!tenantPrinciple) {
      return res.status(404).json({ error: 'Tenant-principle association not found' });
    }

    const deactivatedAssociation = await prisma.tenantPrinciple.update({
      where: {
        tenantId_principleId: {
          tenantId: parseInt(id),
          principleId: parseInt(principleId)
        }
      },
      data: { isActive: false }
    });

    res.json({ data: deactivatedAssociation });
  } catch (error) {
    console.error('Error removing principle from tenant:', error);
    res.status(500).json({ error: 'Failed to remove principle from tenant' });
  }
});

export default router;
