// src/generators/domain/ControllerGenerator.ts
import * as path from 'path';
import { BaseFileGenerator } from '../base/BaseFileGenerator';
import { ProjectInfo } from '../../types/ProjectInfo';
import { FileUtils } from '../../utils/fileUtils';

export class ControllerGenerator extends BaseFileGenerator {
    constructor() {
        super('domain');
    }

    async generate(projectInfo: ProjectInfo, outputPath: string): Promise<void> {
        throw new Error('Use generateForDomain method instead');
    }

    async generateForDomain(domain: string, projectInfo: ProjectInfo, domainPath: string): Promise<void> {
        const capitalizedDomain = domain.charAt(0).toUpperCase() + domain.slice(1);
        const controllerName = `${capitalizedDomain}Controller`;
        const controllerPath = path.join(domainPath, 'infrastructure', 'controllers', `${controllerName}.js`);
        
        const content = this.createControllerContent(domain, capitalizedDomain, controllerName);
        
        await FileUtils.writeFile(controllerPath, content);
        this.filesCreated.push(path.relative(process.cwd(), controllerPath));
        
        console.log(`✅ Generated: ${controllerName}`);
    }

    private createControllerContent(domain: string, capitalizedDomain: string, controllerName: string): string {
        return `// Use Cases
const Create${capitalizedDomain}UseCase = require('../../application/use-cases/Create${capitalizedDomain}UseCase');
const Update${capitalizedDomain}UseCase = require('../../application/use-cases/Update${capitalizedDomain}UseCase');
const Delete${capitalizedDomain}UseCase = require('../../application/use-cases/Delete${capitalizedDomain}UseCase');
const FindById${capitalizedDomain}UseCase = require('../../application/use-cases/FindById${capitalizedDomain}UseCase');
const FindAll${capitalizedDomain}UseCase = require('../../application/use-cases/FindAll${capitalizedDomain}UseCase');

/**
 * ${capitalizedDomain} HTTP Controller
 * Handles HTTP requests and delegates to use cases
 */
class ${controllerName} {
    constructor(${domain}Repository, eventBus) {
        // Initialize use cases with dependencies
        this.create${capitalizedDomain}UseCase = new Create${capitalizedDomain}UseCase(${domain}Repository, eventBus);
        this.update${capitalizedDomain}UseCase = new Update${capitalizedDomain}UseCase(${domain}Repository, eventBus);
        this.delete${capitalizedDomain}UseCase = new Delete${capitalizedDomain}UseCase(${domain}Repository, eventBus);
        this.findById${capitalizedDomain}UseCase = new FindById${capitalizedDomain}UseCase(${domain}Repository);
        this.findAll${capitalizedDomain}UseCase = new FindAll${capitalizedDomain}UseCase(${domain}Repository);
        
        // Bind methods to preserve 'this' context
        this.create = this.create.bind(this);
        this.getAll = this.getAll.bind(this);
        this.getById = this.getById.bind(this);
        this.update = this.update.bind(this);
        this.delete = this.delete.bind(this);
    }

    /**
     * Create a new ${domain}
     * POST /api/${domain}
     */
    async create(req, res) {
        try {
            const ${domain}Data = req.body;
            
            // Basic validation
            if (!${domain}Data) {
                return res.status(400).json({
                    success: false,
                    error: 'Request body is required',
                    code: 'MISSING_BODY'
                });
            }

            const ${domain} = await this.create${capitalizedDomain}UseCase.execute(${domain}Data);
            
            res.status(201).json({
                success: true,
                data: ${domain}.toJSON(),
                message: '${capitalizedDomain} created successfully'
            });
        } catch (error) {
            console.error('Error creating ${domain}:', error);
            
            if (error.message.includes('required') || error.message.includes('validation')) {
                return res.status(400).json({
                    success: false,
                    error: error.message,
                    code: 'VALIDATION_ERROR'
                });
            }
            
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                code: 'INTERNAL_ERROR',
                ...(process.env.NODE_ENV === 'development' && { details: error.message })
            });
        }
    }

    /**
     * Get all ${domain}s with pagination
     * GET /api/${domain}?page=1&limit=10&sortBy=createdAt&sortOrder=desc
     */
    async getAll(req, res) {
        try {
            const options = {
                page: parseInt(req.query.page) || 1,
                limit: Math.min(parseInt(req.query.limit) || 10, 100), // Max 100 items per page
                sortBy: req.query.sortBy || 'createdAt',
                sortOrder: req.query.sortOrder || 'desc'
            };

            // Validate pagination parameters
            if (options.page < 1) options.page = 1;
            if (options.limit < 1) options.limit = 10;

            const result = await this.findAll${capitalizedDomain}UseCase.execute(options);
            
            res.json({
                success: true,
                data: result.data.map(${domain} => ${domain}.toJSON()),
                pagination: result.pagination,
                message: \`Retrieved \${result.data.length} ${domain}s\`
            });
        } catch (error) {
            console.error('Error fetching ${domain}s:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch ${domain}s',
                code: 'FETCH_ERROR',
                ...(process.env.NODE_ENV === 'development' && { details: error.message })
            });
        }
    }

    /**
     * Get ${domain} by ID
     * GET /api/${domain}/:id
     */
    async getById(req, res) {
        try {
            const { id } = req.params;
            
            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: 'ID parameter is required',
                    code: 'MISSING_ID'
                });
            }

            const ${domain} = await this.findById${capitalizedDomain}UseCase.execute(id);
            
            if (!${domain}) {
                return res.status(404).json({
                    success: false,
                    error: '${capitalizedDomain} not found',
                    code: 'NOT_FOUND'
                });
            }
            
            res.json({
                success: true,
                data: ${domain}.toJSON(),
                message: '${capitalizedDomain} retrieved successfully'
            });
        } catch (error) {
            console.error('Error fetching ${domain}:', error);
            
            if (error.message.includes('not found')) {
                return res.status(404).json({
                    success: false,
                    error: error.message,
                    code: 'NOT_FOUND'
                });
            }
            
            res.status(500).json({
                success: false,
                error: 'Failed to fetch ${domain}',
                code: 'FETCH_ERROR',
                ...(process.env.NODE_ENV === 'development' && { details: error.message })
            });
        }
    }

    /**
     * Update ${domain} by ID
     * PUT /api/${domain}/:id
     */
    async update(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            
            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: 'ID parameter is required',
                    code: 'MISSING_ID'
                });
            }

            if (!updateData || Object.keys(updateData).length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Update data is required',
                    code: 'MISSING_UPDATE_DATA'
                });
            }

            const updated${capitalizedDomain} = await this.update${capitalizedDomain}UseCase.execute(id, updateData);
            
            res.json({
                success: true,
                data: updated${capitalizedDomain}.toJSON(),
                message: '${capitalizedDomain} updated successfully'
            });
        } catch (error) {
            console.error('Error updating ${domain}:', error);
            
            if (error.message.includes('not found')) {
                return res.status(404).json({
                    success: false,
                    error: error.message,
                    code: 'NOT_FOUND'
                });
            }
            
            if (error.message.includes('validation')) {
                return res.status(400).json({
                    success: false,
                    error: error.message,
                    code: 'VALIDATION_ERROR'
                });
            }
            
            res.status(500).json({
                success: false,
                error: 'Failed to update ${domain}',
                code: 'UPDATE_ERROR',
                ...(process.env.NODE_ENV === 'development' && { details: error.message })
            });
        }
    }

    /**
     * Delete ${domain} by ID
     * DELETE /api/${domain}/:id
     */
    async delete(req, res) {
        try {
            const { id } = req.params;
            
            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: 'ID parameter is required',
                    code: 'MISSING_ID'
                });
            }

            const result = await this.delete${capitalizedDomain}UseCase.execute(id);
            
            res.json({
                success: true,
                data: result,
                message: '${capitalizedDomain} deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting ${domain}:', error);
            
            if (error.message.includes('not found')) {
                return res.status(404).json({
                    success: false,
                    error: error.message,
                    code: 'NOT_FOUND'
                });
            }
            
            res.status(500).json({
                success: false,
                error: 'Failed to delete ${domain}',
                code: 'DELETE_ERROR',
                ...(process.env.NODE_ENV === 'development' && { details: error.message })
            });
        }
    }

    /**
     * Health check for ${domain} domain
     * GET /api/${domain}/health
     */
    async health(req, res) {
        res.json({
            domain: '${domain}',
            status: 'OK',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            endpoints: {
                'POST /api/${domain}': 'Create ${domain}',
                'GET /api/${domain}': 'Get all ${domain}s',
                'GET /api/${domain}/:id': 'Get ${domain} by ID',
                'PUT /api/${domain}/:id': 'Update ${domain}',
                'DELETE /api/${domain}/:id': 'Delete ${domain}'
            }
        });
    }
}

module.exports = ${controllerName};`;
    }

    getCreatedFiles(): string[] {
        return [...this.filesCreated];
    }
}