// src/generators/domain/DomainGenerator.ts
import * as path from 'path';
import { BaseFileGenerator } from '../base/BaseFileGenerator';
import { ProjectInfo } from '../../types/ProjectInfo';
import { EntityGenerator } from './EntityGenerator';
import { UseCaseGenerator } from './UseCaseGenerator';
import { RepositoryGenerator } from './RepositoryGenerator';
import { ControllerGenerator } from './ControllerGenerator';
import { RoutesGenerator } from './RoutesGenerator';

export class DomainGenerator extends BaseFileGenerator {
    private entityGenerator: EntityGenerator;
    private useCaseGenerator: UseCaseGenerator;
    private repositoryGenerator: RepositoryGenerator;
    private controllerGenerator: ControllerGenerator;
    private routesGenerator: RoutesGenerator;

    constructor() {
        super('domain');
        this.entityGenerator = new EntityGenerator();
        this.useCaseGenerator = new UseCaseGenerator();
        this.repositoryGenerator = new RepositoryGenerator();
        this.controllerGenerator = new ControllerGenerator();
        this.routesGenerator = new RoutesGenerator();
    }

    async generate(projectInfo: ProjectInfo, outputPath: string): Promise<void> {
        this.reset();
        
        try {
            console.log('🏗️ Generating domains...');
            
            for (const domain of projectInfo.domains) {
                await this.generateSingleDomain(domain, projectInfo, outputPath);
            }
            
            console.log(`✅ Generated ${projectInfo.domains.length} domains successfully`);
        } catch (error) {
            this.errors.push(`Failed to generate domains: ${error}`);
            throw error;
        }
    }

    private async generateSingleDomain(
        domain: string, 
        projectInfo: ProjectInfo, 
        outputPath: string
    ): Promise<void> {
        const domainPath = path.join(outputPath, 'src', domain);
        
        console.log(`📁 Generating domain: ${domain}`);
        
        // Crear estructura de directorios
        await this.createDomainStructure(domainPath);
        
        // Generar archivos del dominio
        await this.generateDomainFiles(domain, projectInfo, domainPath);
        
        console.log(`✅ Domain ${domain} generated successfully`);
    }

    private async createDomainStructure(domainPath: string): Promise<void> {
        const directories = [
            'application/services',
            'application/use-cases',
            'application/ports',
            'domain/entities',
            'domain/value-objects',
            'domain/events',
            'infrastructure/repositories',
            'infrastructure/controllers',
            'infrastructure/adapters'
        ];

        await this.createDirectories(domainPath, directories);
    }

    private async generateDomainFiles(
        domain: string, 
        projectInfo: ProjectInfo, 
        domainPath: string
    ): Promise<void> {
        // Generar Entity
        await this.entityGenerator.generateForDomain(domain, projectInfo, domainPath);
        
        // Generar Use Case
        await this.useCaseGenerator.generateForDomain(domain, projectInfo, domainPath);
        // Generar Controller
        await this.controllerGenerator.generateForDomain(domain, projectInfo, domainPath);
        
        // Generar Routes
        await this.routesGenerator.generateForDomain(domain, projectInfo, domainPath);
        
        // Agregar archivos creados al tracking
        this.filesCreated.push(
            ...this.entityGenerator.getCreatedFiles(),
            ...this.useCaseGenerator.getCreatedFiles(),
            ...this.repositoryGenerator.getCreatedFiles(),
            ...this.controllerGenerator.getCreatedFiles(),
            ...this.routesGenerator.getCreatedFiles()
        );
    }

    /**
     * Genera un dominio individual (útil para el comando addDomain)
     */
    async generateDomain(domain: string, projectInfo: ProjectInfo, outputPath: string): Promise<void> {
        await this.generateSingleDomain(domain, projectInfo, outputPath);
    }
}