// src/generators/domain/RoutesGenerator.ts
import * as path from 'path';
import { BaseFileGenerator } from '../base/BaseFileGenerator';
import { ProjectInfo } from '../../types/ProjectInfo';
import { FileUtils } from '../../utils/fileUtils';

export class RoutesGenerator extends BaseFileGenerator {
    constructor() {
        super('domain');
    }

    async generate(projectInfo: ProjectInfo, outputPath: string): Promise<void> {
        throw new Error('Use generateForDomain method instead');
    }

    async generateForDomain(domain: string, projectInfo: ProjectInfo, domainPath: string): Promise<void> {
        const capitalizedDomain = domain.charAt(0).toUpperCase() + domain.slice(1);
        const routesPath = path.join(domainPath, 'infrastructure', 'routes.js');
        
        const content = this.createRoutesContent(domain, capitalizedDomain, projectInfo);
        
        await FileUtils.writeFile(routesPath, content);
        this.filesCreated.push(path.relative(process.cwd(), routesPath));
        
        console.log(`✅ Generated: ${domain} routes`);
    }

    private createRoutesContent(domain: string, capitalizedDomain: string, projectInfo: ProjectInfo): string {
        return `const express = require('express');
const ${capitalizedDomain}Controller = require('./controllers/${capitalizedDomain}Controller');

// TODO: Import repository implementation based on your choice
// For development, you can start with the in-memory repository:
const Memory${capitalizedDomain}Repository = require('./repositories/Memory${capitalizedDomain}Repository');

// For production, uncomment the appropriate repository:
${this.getDatabaseRepositoryImport(domain, capitalizedDomain, projectInfo.database)}

// TODO: Import your event bus implementation
// const EventBus = require('../../shared/infrastructure/messaging/EventBus');

const router = express.Router();

// Initialize dependencies
// For development:
const ${domain}Repository = new Memory${capitalizedDomain}Repository();

// For production with database:
// const ${domain}Repository = new ${this.getDatabaseRepositoryName(capitalizedDomain, projectInfo.database)}();

// Initialize event bus (optional)
// const eventBus = new EventBus();
const eventBus = null; // Disable events for now

// Initialize controller with dependencies
const ${domain}Controller = new ${capitalizedDomain}Controller(${domain}Repository, eventBus);

// Middleware for request logging (development)
if (process.env.NODE_ENV === 'development') {
    router.use((req, res, next) => {
        console.log(\`[\${new Date().toISOString()}] \${req.method} \${req.originalUrl}\`);
        next();
    });
}

// Middleware for request validation (you can customize this)
const validateRequest = (req, res, next) => {
    // Add common validations here
    next();
};

// Routes

/**
 * @route   GET /api/${domain}/health
 * @desc    Health check for ${domain} domain
 * @access  Public
 */
router.get('/health', ${domain}Controller.health);

/**
 * @route   POST /api/${domain}
 * @desc    Create a new ${domain}
 * @access  Public (you might want to add authentication)
 * @body    { name: string }
 */
router.post('/', validateRequest, ${domain}Controller.create);

/**
 * @route   GET /api/${domain}
 * @desc    Get all ${domain}s with pagination
 * @access  Public
 * @query   page: number, limit: number, sortBy: string, sortOrder: 'asc'|'desc'
 */
router.get('/', ${domain}Controller.getAll);

/**
 * @route   GET /api/${domain}/:id
 * @desc    Get ${domain} by ID
 * @access  Public
 * @params  id: string
 */
router.get('/:id', ${domain}Controller.getById);

/**
 * @route   PUT /api/${domain}/:id
 * @desc    Update ${domain} by ID
 * @access  Public (you might want to add authentication)
 * @params  id: string
 * @body    { name?: string }
 */
router.put('/:id', validateRequest, ${domain}Controller.update);

/**
 * @route   DELETE /api/${domain}/:id
 * @desc    Delete ${domain} by ID
 * @access  Public (you might want to add authentication)
 * @params  id: string
 */
router.delete('/:id', ${domain}Controller.delete);

// Error handling middleware for this domain
router.use((error, req, res, next) => {
    console.error(\`Error in ${domain} routes:\`, error);
    
    res.status(500).json({
        success: false,
        error: 'Internal server error in ${domain} domain',
        code: 'DOMAIN_ERROR',
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === 'development' && { 
            stack: error.stack,
            details: error.message 
        })
    });
});

// 404 handler for this domain
router.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found in ${domain} domain',
        code: 'ENDPOINT_NOT_FOUND',
        availableEndpoints: [
            'GET /api/${domain}/health',
            'POST /api/${domain}',
            'GET /api/${domain}',
            'GET /api/${domain}/:id',
            'PUT /api/${domain}/:id',
            'DELETE /api/${domain}/:id'
        ],
        timestamp: new Date().toISOString()
    });
});

module.exports = router;`;
    }

    private getDatabaseRepositoryImport(domain: string, capitalizedDomain: string, database: string): string {
        if (database === 'none') {
            return `// No database repository needed`;
        }

        const repositoryName = this.getDatabaseRepositoryName(capitalizedDomain, database);
        return `// const ${repositoryName} = require('./repositories/${repositoryName}');`;
    }

    private getDatabaseRepositoryName(capitalizedDomain: string, database: string): string {
        switch (database) {
            case 'mongodb': return `Mongo${capitalizedDomain}Repository`;
            case 'postgresql': return `Postgres${capitalizedDomain}Repository`;
            case 'mysql': return `Mysql${capitalizedDomain}Repository`;
            default: return `Memory${capitalizedDomain}Repository`;
        }
    }

    getCreatedFiles(): string[] {
        return [...this.filesCreated];
    }
}