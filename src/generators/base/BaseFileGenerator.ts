// src/generators/base/BaseFileGenerator.ts
import * as path from 'path';
import { IFileGenerator, GeneratorResult, TemplateData } from '../../types/GeneratorTypes';
import { ProjectInfo } from '../../types/ProjectInfo';
import { FileUtils } from '../../utils/fileUtils';
import { TemplateEngine } from '../../utils/templateEngine';

export abstract class BaseFileGenerator implements IFileGenerator {
    protected templateCategory: string;
    protected filesCreated: string[] = [];
    protected errors: string[] = [];

    constructor(templateCategory: string) {
        this.templateCategory = templateCategory;
    }

    /**
     * Método principal que deben implementar las clases hijas
     */
    abstract generate(projectInfo: ProjectInfo, outputPath: string): Promise<void>;

    /**
     * Genera un archivo desde un template
     */
    protected async generateFile(
        templateName: string, 
        outputPath: string, 
        data: TemplateData,
        customTemplatePath?: string
    ): Promise<void> {
        try {
            const templatePath = customTemplatePath || 
                TemplateEngine.getTemplatePath(this.templateCategory, templateName);
            
            if (!TemplateEngine.templateExists(templatePath)) {
                throw new Error(`Template not found: ${templatePath}`);
            }

            await TemplateEngine.renderToFile(templatePath, outputPath, data);
            this.filesCreated.push(path.relative(process.cwd(), outputPath));
            
            console.log(`✅ Generated: ${path.basename(outputPath)}`);
        } catch (error) {
            const errorMsg = `Failed to generate ${path.basename(outputPath)}: ${error}`;
            this.errors.push(errorMsg);
            console.error(`❌ ${errorMsg}`);
            throw error;
        }
    }

    /**
     * Genera múltiples archivos desde templates
     */
    protected async generateFiles(
        templates: Array<{
            templateName: string;
            outputPath: string;
            data: TemplateData;
        }>
    ): Promise<void> {
        for (const template of templates) {
            await this.generateFile(
                template.templateName,
                template.outputPath,
                template.data
            );
        }
    }

    /**
     * Crea directorios necesarios
     */
    protected async createDirectories(basePath: string, directories: string[]): Promise<void> {
        try {
            const created = await FileUtils.createDirectories(basePath, directories);
            console.log(`📁 Created ${created.length} directories`);
        } catch (error) {
            const errorMsg = `Failed to create directories: ${error}`;
            this.errors.push(errorMsg);
            throw new Error(errorMsg);
        }
    }

    /**
     * Crea un template data con datos comunes
     */
    protected createTemplateData(projectInfo: ProjectInfo, additionalData?: any): TemplateData {
        return TemplateEngine.createTemplateData(projectInfo, additionalData);
    }

    /**
     * Obtiene el resultado de la generación
     */
    protected getResult(success: boolean, message: string): GeneratorResult {
        return {
            success,
            message,
            filesCreated: [...this.filesCreated],
            errors: this.errors.length > 0 ? [...this.errors] : undefined
        };
    }

    /**
     * Reset del estado interno
     */
    protected reset(): void {
        this.filesCreated = [];
        this.errors = [];
    }

    /**
     * Utilidad para obtener ruta de salida
     */
    protected getOutputPath(basePath: string, ...segments: string[]): string {
        return path.join(basePath, ...segments);
    }

    /**
     * Valida que el directorio de salida existe
     */
    protected async validateOutputPath(outputPath: string): Promise<void> {
        if (!FileUtils.exists(outputPath)) {
            throw new Error(`Output directory does not exist: ${outputPath}`);
        }
    }

    /**
     * Utilidad para generar múltiples archivos de un dominio
     */
    protected async generateDomainFiles(
        domainName: string,
        projectInfo: ProjectInfo,
        basePath: string,
        templates: string[]
    ): Promise<void> {
        const capitalizedDomain = domainName.charAt(0).toUpperCase() + domainName.slice(1);
        
        for (const templateName of templates) {
            const data = this.createTemplateData(projectInfo, {
                domain: domainName,
                capitalizedDomain,
                domainName,
                capitalizedDomainName: capitalizedDomain
            });

            const outputFileName = templateName.replace('domain', capitalizedDomain);
            const outputPath = this.getOutputPath(basePath, `${outputFileName}.js`);
            
            await this.generateFile(templateName, outputPath, data);
        }
    }
}