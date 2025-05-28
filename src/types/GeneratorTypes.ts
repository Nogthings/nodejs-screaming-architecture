// src/types/GeneratorTypes.ts
import { ProjectInfo } from './ProjectInfo';

export interface IGenerator {
    generate(projectInfo: ProjectInfo, outputPath: string): Promise<void>;
}

export interface IFileGenerator extends IGenerator {
    generateFile(templatePath: string, outputPath: string, data: any): Promise<void>;
}

export interface IDirectoryGenerator extends IGenerator {
    createDirectories(basePath: string, directories: string[]): Promise<void>;
}

export type GeneratorType = 
    | 'base'
    | 'domain' 
    | 'docker' 
    | 'config'
    | 'package'
    | 'readme'
    | 'server'
    | 'env';

export interface GeneratorResult {
    success: boolean;
    message: string;
    filesCreated: string[];
    errors?: string[];
}

export interface TemplateData {
    projectInfo: ProjectInfo;
    domain?: string;
    capitalizedDomain?: string;
    [key: string]: any;
}