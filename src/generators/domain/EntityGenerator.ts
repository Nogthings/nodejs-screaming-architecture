// src/generators/domain/EntityGenerator.ts
import * as path from 'path';
import { BaseFileGenerator } from '../base/BaseFileGenerator';
import { ProjectInfo } from '../../types/ProjectInfo';

export class EntityGenerator extends BaseFileGenerator {
    constructor() {
        super('domain');
    }

    async generate(projectInfo: ProjectInfo, outputPath: string): Promise<void> {
        // Este método no se usa directamente, sino generateForDomain
        throw new Error('Use generateForDomain method instead');
    }

    async generateForDomain(domain: string, projectInfo: ProjectInfo, domainPath: string): Promise<void> {
        const capitalizedDomain = domain.charAt(0).toUpperCase() + domain.slice(1);
        const entityPath = path.join(domainPath, 'domain', 'entities', `${capitalizedDomain}.js`);
        
        const data = this.createTemplateData(projectInfo, {
            domain,
            capitalizedDomain,
            domainName: domain,
            capitalizedDomainName: capitalizedDomain
        });

        // Generar usando template o código directo
        await this.generateEntityFile(entityPath, data);
        this.filesCreated.push(path.relative(process.cwd(), entityPath));
    }

    private async generateEntityFile(outputPath: string, data: any): Promise<void> {
        const entityContent = this.createEntityContent(data);
        
        const { FileUtils } = await import('../../utils/fileUtils');
        await FileUtils.writeFile(outputPath, entityContent);
        
        console.log(`✅ Generated: ${data.capitalizedDomain} entity`);
    }

    private createEntityContent(data: any): string {
        return `class ${data.capitalizedDomain} {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }

    updateName(newName) {
        if (!newName || newName.trim().length === 0) {
            throw new Error('Name cannot be empty');
        }
        this.name = newName;
        this.updatedAt = new Date();
    }

    update(data) {
        if (data.name) {
            this.updateName(data.name);
        }
        this.updatedAt = new Date();
        return this;
    }

    isValid() {
        return this.id && this.name && this.name.trim().length > 0;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    static create(id, name) {
        const ${data.domain} = new ${data.capitalizedDomain}(id, name);
        if (!${data.domain}.isValid()) {
            throw new Error('Invalid ${data.domain} data');
        }
        return ${data.domain};
    }

    static fromJSON(json) {
        const ${data.domain} = new ${data.capitalizedDomain}(json.id, json.name);
        ${data.domain}.createdAt = new Date(json.createdAt);
        ${data.domain}.updatedAt = new Date(json.updatedAt);
        return ${data.domain};
    }
}

module.exports = ${data.capitalizedDomain};`;
    }

    getCreatedFiles(): string[] {
        return [...this.filesCreated];
    }
}