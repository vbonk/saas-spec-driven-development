"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const embedding_service_1 = require("../services/embedding.service");
const validation_service_1 = require("../services/validation.service");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const embeddingService = new embedding_service_1.EmbeddingService();
const validationService = new validation_service_1.ValidationService();
// GET /api/v1/principles - Get all principles
router.get('/', async (req, res) => {
    try {
        const { category, active, limit = 50, offset = 0 } = req.query;
        const where = {};
        if (category)
            where.category = category;
        if (active !== undefined)
            where.isActive = active === 'true';
        const principles = await prisma.principle.findMany({
            where,
            take: parseInt(limit),
            skip: parseInt(offset),
            orderBy: { createdAt: 'desc' }
        });
        const total = await prisma.principle.count({ where });
        res.json({
            data: principles,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    }
    catch (error) {
        console.error('Error fetching principles:', error);
        res.status(500).json({ error: 'Failed to fetch principles' });
    }
});
// GET /api/v1/principles/:id - Get a specific principle
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const principle = await prisma.principle.findUnique({
            where: { id: parseInt(id) },
            include: {
                tenantPrinciples: {
                    include: {
                        tenant: true
                    }
                }
            }
        });
        if (!principle) {
            return res.status(404).json({ error: 'Principle not found' });
        }
        res.json({ data: principle });
    }
    catch (error) {
        console.error('Error fetching principle:', error);
        res.status(500).json({ error: 'Failed to fetch principle' });
    }
});
// POST /api/v1/principles - Create a new principle
router.post('/', async (req, res) => {
    try {
        const { principle, category } = req.body;
        // Validate input
        const validation = validationService.validatePrinciple({ principle, category });
        if (!validation.isValid) {
            return res.status(400).json({ error: validation.errors });
        }
        // Generate embedding
        const embedding = await embeddingService.generateEmbedding(principle);
        const newPrinciple = await prisma.principle.create({
            data: {
                principle,
                category,
                embedding: embedding ? `[${embedding.join(',')}]` : null
            }
        });
        res.status(201).json({ data: newPrinciple });
    }
    catch (error) {
        console.error('Error creating principle:', error);
        res.status(500).json({ error: 'Failed to create principle' });
    }
});
// PUT /api/v1/principles/:id - Update a principle
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { principle, category, isActive } = req.body;
        // Check if principle exists
        const existingPrinciple = await prisma.principle.findUnique({
            where: { id: parseInt(id) }
        });
        if (!existingPrinciple) {
            return res.status(404).json({ error: 'Principle not found' });
        }
        // Validate input
        const validation = validationService.validatePrinciple({ principle, category });
        if (!validation.isValid) {
            return res.status(400).json({ error: validation.errors });
        }
        // Generate new embedding if principle text changed
        let embedding = null;
        if (principle && principle !== existingPrinciple.principle) {
            const embeddingVector = await embeddingService.generateEmbedding(principle);
            embedding = embeddingVector ? `[${embeddingVector.join(',')}]` : null;
        }
        const updateData = {};
        if (principle)
            updateData.principle = principle;
        if (category)
            updateData.category = category;
        if (isActive !== undefined)
            updateData.isActive = isActive;
        if (embedding)
            updateData.embedding = embedding;
        const updatedPrinciple = await prisma.principle.update({
            where: { id: parseInt(id) },
            data: updateData
        });
        res.json({ data: updatedPrinciple });
    }
    catch (error) {
        console.error('Error updating principle:', error);
        res.status(500).json({ error: 'Failed to update principle' });
    }
});
// DELETE /api/v1/principles/:id - Deactivate a principle
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const principle = await prisma.principle.findUnique({
            where: { id: parseInt(id) }
        });
        if (!principle) {
            return res.status(404).json({ error: 'Principle not found' });
        }
        const deactivatedPrinciple = await prisma.principle.update({
            where: { id: parseInt(id) },
            data: { isActive: false }
        });
        res.json({ data: deactivatedPrinciple });
    }
    catch (error) {
        console.error('Error deactivating principle:', error);
        res.status(500).json({ error: 'Failed to deactivate principle' });
    }
});
// POST /api/v1/principles/search - Search principles by similarity
router.post('/search', async (req, res) => {
    try {
        const { query, limit = 10, threshold = 0.7 } = req.body;
        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }
        // Generate embedding for the query
        const queryEmbedding = await embeddingService.generateEmbedding(query);
        if (!queryEmbedding) {
            return res.status(500).json({ error: 'Failed to generate query embedding' });
        }
        // Perform vector similarity search
        const results = await prisma.$queryRaw `
      SELECT 
        id, 
        principle, 
        category, 
        is_active,
        created_at,
        updated_at,
        1 - (embedding <=> ${`[${queryEmbedding.join(',')}]`}::vector) as similarity
      FROM principles 
      WHERE is_active = true 
        AND embedding IS NOT NULL
        AND 1 - (embedding <=> ${`[${queryEmbedding.join(',')}]`}::vector) > ${threshold}
      ORDER BY similarity DESC 
      LIMIT ${limit}
    `;
        res.json({ data: results });
    }
    catch (error) {
        console.error('Error searching principles:', error);
        res.status(500).json({ error: 'Failed to search principles' });
    }
});
module.exports = router;
//# sourceMappingURL=principles.js.map