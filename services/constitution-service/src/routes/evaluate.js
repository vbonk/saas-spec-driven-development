"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const embedding_service_1 = require("../services/embedding.service");
const validation_service_1 = require("../services/validation.service");
const evaluation_service_1 = require("../services/evaluation.service");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const embeddingService = new embedding_service_1.EmbeddingService();
const validationService = new validation_service_1.ValidationService();
const evaluationService = new evaluation_service_1.EvaluationService();
// POST /api/v1/evaluate - Evaluate an action against constitutional principles
router.post('/', async (req, res) => {
    try {
        const { action, tenantId, metadata } = req.body;
        // Validate input
        const validation = validationService.validateEvaluation({ action, tenantId, metadata });
        if (!validation.isValid) {
            return res.status(400).json({ error: validation.errors });
        }
        // Check if tenant exists (if tenantId provided)
        let tenant = null;
        if (tenantId) {
            tenant = await prisma.tenant.findUnique({
                where: { id: tenantId, isActive: true }
            });
            if (!tenant) {
                return res.status(404).json({ error: 'Tenant not found or inactive' });
            }
        }
        // Perform evaluation
        const evaluationResult = await evaluationService.evaluateAction(action, tenantId);
        // Log the evaluation
        const evaluationLog = await prisma.evaluationLog.create({
            data: {
                tenantId: tenantId || null,
                action: validationService.sanitizeString(action),
                result: JSON.stringify(evaluationResult),
                score: evaluationResult.overallScore,
                metadata: metadata || null
            }
        });
        res.json({
            data: {
                ...evaluationResult,
                logId: evaluationLog.id,
                timestamp: evaluationLog.createdAt
            }
        });
    }
    catch (error) {
        console.error('Error evaluating action:', error);
        res.status(500).json({ error: 'Failed to evaluate action' });
    }
});
// POST /api/v1/evaluate/batch - Evaluate multiple actions in batch
router.post('/batch', async (req, res) => {
    try {
        const { actions, tenantId, metadata } = req.body;
        if (!Array.isArray(actions) || actions.length === 0) {
            return res.status(400).json({ error: 'Actions must be a non-empty array' });
        }
        if (actions.length > 100) {
            return res.status(400).json({ error: 'Cannot evaluate more than 100 actions at once' });
        }
        // Validate each action
        for (const action of actions) {
            const validation = validationService.validateEvaluation({ action, tenantId, metadata });
            if (!validation.isValid) {
                return res.status(400).json({ error: `Invalid action: ${validation.errors.join(', ')}` });
            }
        }
        // Check if tenant exists (if tenantId provided)
        let tenant = null;
        if (tenantId) {
            tenant = await prisma.tenant.findUnique({
                where: { id: tenantId, isActive: true }
            });
            if (!tenant) {
                return res.status(404).json({ error: 'Tenant not found or inactive' });
            }
        }
        // Perform batch evaluation
        const evaluationResults = await Promise.all(actions.map(action => evaluationService.evaluateAction(action, tenantId)));
        // Log all evaluations
        const evaluationLogs = await Promise.all(actions.map(async (action, index) => {
            return prisma.evaluationLog.create({
                data: {
                    tenantId: tenantId || null,
                    action: validationService.sanitizeString(action),
                    result: JSON.stringify(evaluationResults[index]),
                    score: evaluationResults[index].overallScore,
                    metadata: metadata || null
                }
            });
        }));
        // Calculate batch statistics
        const scores = evaluationResults.map(result => result.overallScore);
        const batchStats = {
            totalActions: actions.length,
            averageScore: scores.reduce((sum, score) => sum + score, 0) / scores.length,
            minScore: Math.min(...scores),
            maxScore: Math.max(...scores),
            passedActions: scores.filter(score => score >= 0.7).length,
            failedActions: scores.filter(score => score < 0.7).length
        };
        res.json({
            data: {
                results: evaluationResults.map((result, index) => ({
                    ...result,
                    logId: evaluationLogs[index].id,
                    timestamp: evaluationLogs[index].createdAt
                })),
                batchStats
            }
        });
    }
    catch (error) {
        console.error('Error evaluating batch actions:', error);
        res.status(500).json({ error: 'Failed to evaluate batch actions' });
    }
});
// GET /api/v1/evaluate/logs - Get evaluation logs
router.get('/logs', async (req, res) => {
    try {
        const { tenantId, limit = 50, offset = 0, minScore, maxScore } = req.query;
        const where = {};
        if (tenantId)
            where.tenantId = parseInt(tenantId);
        if (minScore !== undefined)
            where.score = { ...where.score, gte: parseFloat(minScore) };
        if (maxScore !== undefined)
            where.score = { ...where.score, lte: parseFloat(maxScore) };
        const logs = await prisma.evaluationLog.findMany({
            where,
            take: parseInt(limit),
            skip: parseInt(offset),
            orderBy: { createdAt: 'desc' },
            include: {
                tenant: {
                    select: {
                        id: true,
                        name: true,
                        slug: true
                    }
                }
            }
        });
        const total = await prisma.evaluationLog.count({ where });
        // Calculate statistics
        const scores = logs.map(log => log.score).filter(score => score !== null);
        const stats = scores.length > 0 ? {
            totalLogs: total,
            averageScore: scores.reduce((sum, score) => sum + score, 0) / scores.length,
            minScore: Math.min(...scores),
            maxScore: Math.max(...scores),
            passedEvaluations: scores.filter(score => score >= 0.7).length,
            failedEvaluations: scores.filter(score => score < 0.7).length
        } : null;
        res.json({
            data: logs,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset)
            },
            stats
        });
    }
    catch (error) {
        console.error('Error fetching evaluation logs:', error);
        res.status(500).json({ error: 'Failed to fetch evaluation logs' });
    }
});
// GET /api/v1/evaluate/logs/:id - Get a specific evaluation log
router.get('/logs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const log = await prisma.evaluationLog.findUnique({
            where: { id: parseInt(id) },
            include: {
                tenant: {
                    select: {
                        id: true,
                        name: true,
                        slug: true
                    }
                }
            }
        });
        if (!log) {
            return res.status(404).json({ error: 'Evaluation log not found' });
        }
        // Parse the result JSON
        let parsedResult = null;
        try {
            parsedResult = JSON.parse(log.result);
        }
        catch (error) {
            console.error('Error parsing evaluation result:', error);
        }
        res.json({
            data: {
                ...log,
                parsedResult
            }
        });
    }
    catch (error) {
        console.error('Error fetching evaluation log:', error);
        res.status(500).json({ error: 'Failed to fetch evaluation log' });
    }
});
// DELETE /api/v1/evaluate/logs/:id - Delete an evaluation log
router.delete('/logs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const log = await prisma.evaluationLog.findUnique({
            where: { id: parseInt(id) }
        });
        if (!log) {
            return res.status(404).json({ error: 'Evaluation log not found' });
        }
        await prisma.evaluationLog.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Evaluation log deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting evaluation log:', error);
        res.status(500).json({ error: 'Failed to delete evaluation log' });
    }
});
// GET /api/v1/evaluate/stats - Get evaluation statistics
router.get('/stats', async (req, res) => {
    try {
        const { tenantId, days = 30 } = req.query;
        const dateThreshold = new Date();
        dateThreshold.setDate(dateThreshold.getDate() - parseInt(days));
        const where = {
            createdAt: { gte: dateThreshold }
        };
        if (tenantId)
            where.tenantId = parseInt(tenantId);
        // Get basic statistics
        const totalEvaluations = await prisma.evaluationLog.count({ where });
        const scoreStats = await prisma.evaluationLog.aggregate({
            where: { ...where, score: { not: null } },
            _avg: { score: true },
            _min: { score: true },
            _max: { score: true }
        });
        // Get evaluations by score ranges
        const scoreRanges = await Promise.all([
            prisma.evaluationLog.count({ where: { ...where, score: { gte: 0.9 } } }),
            prisma.evaluationLog.count({ where: { ...where, score: { gte: 0.7, lt: 0.9 } } }),
            prisma.evaluationLog.count({ where: { ...where, score: { gte: 0.5, lt: 0.7 } } }),
            prisma.evaluationLog.count({ where: { ...where, score: { lt: 0.5 } } })
        ]);
        // Get daily evaluation counts
        const dailyStats = await prisma.$queryRaw `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        AVG(score) as avg_score
      FROM evaluation_logs 
      WHERE created_at >= ${dateThreshold}
        ${tenantId ? `AND tenant_id = ${parseInt(tenantId)}` : ''}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `;
        res.json({
            data: {
                totalEvaluations,
                averageScore: scoreStats._avg.score,
                minScore: scoreStats._min.score,
                maxScore: scoreStats._max.score,
                scoreDistribution: {
                    excellent: scoreRanges[0], // >= 0.9
                    good: scoreRanges[1], // 0.7 - 0.89
                    fair: scoreRanges[2], // 0.5 - 0.69
                    poor: scoreRanges[3] // < 0.5
                },
                dailyStats
            }
        });
    }
    catch (error) {
        console.error('Error fetching evaluation statistics:', error);
        res.status(500).json({ error: 'Failed to fetch evaluation statistics' });
    }
});
module.exports = router;
//# sourceMappingURL=evaluate.js.map