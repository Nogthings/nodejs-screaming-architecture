// src/generators/domain/UseCaseGenerator.ts
import * as path from 'path';
import { BaseFileGenerator } from '../base/BaseFileGenerator';
import { ProjectInfo } from '../../types/ProjectInfo';
import { FileUtils } from '../../utils/fileUtils';

export class UseCaseGenerator extends BaseFileGenerator {
    constructor() {
        super('domain');
    }

    async generate(projectInfo: ProjectInfo, outputPath: string): Promise<void> {
        throw new Error('Use generateForDomain method instead');
    }

    async generateForDomain(domain: string, projectInfo: ProjectInfo, domainPath: string): Promise<void> {
        const capitalizedDomain = domain.charAt(0).toUpperCase() + domain.slice(1);
        
        // Generar múltiples casos de uso
        const useCases = [
            { name: 'Create', action: 'create' },
            { name: 'Update', action: 'update' },
            { name: 'Delete', action: 'delete' },
            { name: 'FindById', action: 'findById' },
            { name: 'FindAll', action: 'findAll' }
        ];

        for (const useCase of useCases) {
            await this.generateUseCase(domain, capitalizedDomain, useCase, domainPath);
        }
    }

    private async generateUseCase(
        domain: string, 
        capitalizedDomain: string, 
        useCase: any, 
        domainPath: string
    ): Promise<void> {
        const useCaseName = `${useCase.name}${capitalizedDomain}UseCase`;
        const useCasePath = path.join(domainPath, 'application', 'use-cases', `${useCaseName}.js`);
        
        const content = this.createUseCaseContent(domain, capitalizedDomain, useCase);
        
        await FileUtils.writeFile(useCasePath, content);
        this.filesCreated.push(path.relative(process.cwd(), useCasePath));
        
        console.log(`✅ Generated: ${useCaseName}`);
    }

    private createUseCaseContent(domain: string, capitalizedDomain: string, useCase: any): string {
        const useCaseName = `${useCase.name}${capitalizedDomain}UseCase`;
        
        switch (useCase.action) {
            case 'create':
                return this.createCreateUseCase(domain, capitalizedDomain, useCaseName);
            case 'update':
                return this.createUpdateUseCase(domain, capitalizedDomain, useCaseName);
            case 'delete':
                return this.createDeleteUseCase(domain, capitalizedDomain, useCaseName);
            case 'findById':
                return this.createFindByIdUseCase(domain, capitalizedDomain, useCaseName);
            case 'findAll':
                return this.createFindAllUseCase(domain, capitalizedDomain, useCaseName);
            default:
                return this.createGenericUseCase(domain, capitalizedDomain, useCaseName);
        }
    }

    private createCreateUseCase(domain: string, capitalizedDomain: string, useCaseName: string): string {
        return `const ${capitalizedDomain} = require('../../domain/entities/${capitalizedDomain}');

class ${useCaseName} {
    constructor(${domain}Repository, eventBus) {
        this.${domain}Repository = ${domain}Repository;
        this.eventBus = eventBus;
    }

    async execute(${domain}Data) {
        try {
            // Validate input
            this.validateInput(${domain}Data);

            // Create entity
            const ${domain} = ${capitalizedDomain}.create(
                ${domain}Data.id || this.generateId(),
                ${domain}Data.name
            );

            // Save to repository
            const saved${capitalizedDomain} = await this.${domain}Repository.save(${domain});

            // Publish domain event
            if (this.eventBus) {
                await this.eventBus.publish({
                    type: '${capitalizedDomain}Created',
                    aggregateId: saved${capitalizedDomain}.id,
                    data: saved${capitalizedDomain}.toJSON(),
                    timestamp: new Date(),
                    version: 1
                });
            }

            return saved${capitalizedDomain};
        } catch (error) {
            throw new Error(\`Failed to create ${domain}: \${error.message}\`);
        }
    }

    validateInput(${domain}Data) {
        if (!${domain}Data) {
            throw new Error('${capitalizedDomain} data is required');
        }
        if (!${domain}Data.name || ${domain}Data.name.trim().length === 0) {
            throw new Error('${capitalizedDomain} name is required');
        }
        if (${domain}Data.name.length > 255) {
            throw new Error('${capitalizedDomain} name is too long');
        }
    }

    generateId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }
}

module.exports = ${useCaseName};`;
    }

    private createUpdateUseCase(domain: string, capitalizedDomain: string, useCaseName: string): string {
        return `class ${useCaseName} {
    constructor(${domain}Repository, eventBus) {
        this.${domain}Repository = ${domain}Repository;
        this.eventBus = eventBus;
    }

    async execute(id, updateData) {
        try {
            // Find existing entity
            const existing${capitalizedDomain} = await this.${domain}Repository.findById(id);
            if (!existing${capitalizedDomain}) {
                throw new Error('${capitalizedDomain} not found');
            }

            // Update entity
            existing${capitalizedDomain}.update(updateData);

            // Save changes
            const updated${capitalizedDomain} = await this.${domain}Repository.save(existing${capitalizedDomain});

            // Publish domain event
            if (this.eventBus) {
                await this.eventBus.publish({
                    type: '${capitalizedDomain}Updated',
                    aggregateId: updated${capitalizedDomain}.id,
                    data: updated${capitalizedDomain}.toJSON(),
                    timestamp: new Date(),
                    version: 1
                });
            }

            return updated${capitalizedDomain};
        } catch (error) {
            throw new Error(\`Failed to update ${domain}: \${error.message}\`);
        }
    }
}

module.exports = ${useCaseName};`;
    }

    private createDeleteUseCase(domain: string, capitalizedDomain: string, useCaseName: string): string {
        return `class ${useCaseName} {
    constructor(${domain}Repository, eventBus) {
        this.${domain}Repository = ${domain}Repository;
        this.eventBus = eventBus;
    }

    async execute(id) {
        try {
            // Verify entity exists
            const existing${capitalizedDomain} = await this.${domain}Repository.findById(id);
            if (!existing${capitalizedDomain}) {
                throw new Error('${capitalizedDomain} not found');
            }

            // Delete entity
            await this.${domain}Repository.delete(id);

            // Publish domain event
            if (this.eventBus) {
                await this.eventBus.publish({
                    type: '${capitalizedDomain}Deleted',
                    aggregateId: id,
                    data: { id },
                    timestamp: new Date(),
                    version: 1
                });
            }

            return { id, deleted: true };
        } catch (error) {
            throw new Error(\`Failed to delete ${domain}: \${error.message}\`);
        }
    }
}

module.exports = ${useCaseName};`;
    }

    private createFindByIdUseCase(domain: string, capitalizedDomain: string, useCaseName: string): string {
        return `class ${useCaseName} {
    constructor(${domain}Repository) {
        this.${domain}Repository = ${domain}Repository;
    }

    async execute(id) {
        try {
            if (!id) {
                throw new Error('ID is required');
            }

            const ${domain} = await this.${domain}Repository.findById(id);
            
            if (!${domain}) {
                throw new Error('${capitalizedDomain} not found');
            }

            return ${domain};
        } catch (error) {
            throw new Error(\`Failed to find ${domain}: \${error.message}\`);
        }
    }
}

module.exports = ${useCaseName};`;
    }

    private createFindAllUseCase(domain: string, capitalizedDomain: string, useCaseName: string): string {
        return `class ${useCaseName} {
    constructor(${domain}Repository) {
        this.${domain}Repository = ${domain}Repository;
    }

    async execute(options = {}) {
        try {
            const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = options;
            
            const ${domain}s = await this.${domain}Repository.findAll({
                page,
                limit,
                sortBy,
                sortOrder
            });

            return {
                data: ${domain}s,
                pagination: {
                    page,
                    limit,
                    total: ${domain}s.length
                }
            };
        } catch (error) {
            throw new Error(\`Failed to find ${domain}s: \${error.message}\`);
        }
    }
}

module.exports = ${useCaseName};`;
    }

    private createGenericUseCase(domain: string, capitalizedDomain: string, useCaseName: string): string {
        return `class ${useCaseName} {
    constructor(${domain}Repository, eventBus) {
        this.${domain}Repository = ${domain}Repository;
        this.eventBus = eventBus;
    }

    async execute() {
        // TODO: Implement use case logic
        throw new Error('Use case not implemented yet');
    }
}

module.exports = ${useCaseName};`;
    }

    getCreatedFiles(): string[] {
        return [...this.filesCreated];
    }
}