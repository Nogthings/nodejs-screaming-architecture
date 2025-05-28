// src/utils/templateEngine.ts
import * as path from 'path';
import { FileUtils } from './fileUtils';
import { TemplateData } from '../types/GeneratorTypes';

export class TemplateEngine {
    private static readonly TEMPLATE_EXTENSION = '.template';

    /**
     * Renderiza un template con los datos proporcionados
     */
    static async render(templatePath: string, data: TemplateData): Promise<string> {
        try {
            // Leer el template
            const templateContent = await FileUtils.readFile(templatePath);
            
            // Procesar el template
            return this.interpolate(templateContent, data);
        } catch (error) {
            throw new Error(`Failed to render template ${templatePath}: ${error}`);
        }
    }

    /**
     * Renderiza un template y lo guarda en un archivo
     */
    static async renderToFile(
        templatePath: string, 
        outputPath: string, 
        data: TemplateData
    ): Promise<void> {
        try {
            const content = await this.render(templatePath, data);
            await FileUtils.writeFile(outputPath, content);
        } catch (error) {
            throw new Error(`Failed to render template to file: ${error}`);
        }
    }

    /**
     * Obtiene la ruta del template basado en el nombre
     */
    static getTemplatePath(category: string, templateName: string): string {
        const extensionPath = path.join(__dirname, '..', '..');
        return path.join(extensionPath, 'src', 'templates', category, `${templateName}${this.TEMPLATE_EXTENSION}`);
    }

    /**
     * Interpola variables en el template
     * Soporta sintaxis: ${variable} y ${object.property}
     */
    private static interpolate(template: string, data: TemplateData): string {
        return template.replace(/\$\{([^}]+)\}/g, (match, key) => {
            try {
                // Soportar propiedades anidadas como projectInfo.name
                const value = this.getNestedProperty(data, key.trim());
                return value !== undefined ? String(value) : match;
            } catch (error) {
                console.warn(`Template interpolation warning: Could not resolve ${key}`);
                return match;
            }
        });
    }

    /**
     * Obtiene una propiedad anidada de un objeto
     */
    private static getNestedProperty(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    /**
     * Genera datos de template con valores comunes
     */
    static createTemplateData(projectInfo: any, additionalData?: any): TemplateData {
        const domains = projectInfo.domains || [];
        
        return {
            projectInfo,
            // Helpers comunes
            domains: domains.map((domain: string) => ({
                name: domain,
                capitalizedName: this.capitalize(domain),
                upperCaseName: domain.toUpperCase(),
                camelCaseName: this.toCamelCase(domain)
            })),
            // Utilidades de formato
            currentYear: new Date().getFullYear(),
            currentDate: new Date().toISOString().split('T')[0],
            timestamp: new Date().toISOString(),
            ...additionalData
        };
    }

    /**
     * Helper: Capitaliza la primera letra
     */
    private static capitalize(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    /**
     * Helper: Convierte a camelCase
     */
    private static toCamelCase(str: string): string {
        return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    }

    /**
     * Valida que un template existe
     */
    static templateExists(templatePath: string): boolean {
        return FileUtils.exists(templatePath);
    }
}