// src/generators/base/PackageJsonGenerator.ts
import * as path from 'path';
import { BaseFileGenerator } from './BaseFileGenerator';
import { ProjectInfo } from '../../types/ProjectInfo';
import { FileUtils } from '../../utils/fileUtils';

export class PackageJsonGenerator extends BaseFileGenerator {
    constructor() {
        super('base');
    }

    async generate(projectInfo: ProjectInfo, outputPath: string): Promise<void> {
        this.reset();
        
        try {
            const packageJsonPath = path.join(outputPath, 'package.json');
            const packageJson = this.createPackageJson(projectInfo);
            
            await FileUtils.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
            this.filesCreated.push('package.json');
            
            console.log('✅ Generated: package.json');
        } catch (error) {
            this.errors.push(`Failed to generate package.json: ${error}`);
            throw error;
        }
    }

    private createPackageJson(projectInfo: ProjectInfo): any {
        const packageJson: any = {
            name: projectInfo.name,
            version: projectInfo.version,
            description: projectInfo.description,
            main: "src/server.js",
            scripts: {
                start: "node src/server.js",
                dev: "nodemon src/server.js"
            },
            author: projectInfo.author,
            license: "MIT",
            dependencies: {
                express: "^4.18.2",
                cors: "^2.8.5",
                helmet: "^7.0.0",
                dotenv: "^16.3.1"
            },
            devDependencies: {
                nodemon: "^3.0.1"
            }
        };

        // Agregar dependencias de base de datos
        this.addDatabaseDependencies(packageJson, projectInfo.database);

        // Agregar dependencias de testing
        if (projectInfo.includeTests) {
            this.addTestingDependencies(packageJson);
        }

        return packageJson;
    }

    private addDatabaseDependencies(packageJson: any, database: string): void {
        switch (database) {
            case 'mongodb':
                packageJson.dependencies.mongoose = "^7.5.0";
                break;
            case 'postgresql':
                packageJson.dependencies.pg = "^8.11.3";
                packageJson.devDependencies["@types/pg"] = "^8.10.2";
                break;
            case 'mysql':
                packageJson.dependencies.mysql2 = "^3.6.0";
                break;
            default:
                // No database dependencies
                break;
        }
    }

    private addTestingDependencies(packageJson: any): void {
        packageJson.scripts.test = "jest";
        packageJson.scripts["test:watch"] = "jest --watch";
        packageJson.scripts["test:coverage"] = "jest --coverage";
        
        packageJson.devDependencies.jest = "^29.6.4";
        packageJson.devDependencies.supertest = "^6.3.3";
        packageJson.devDependencies["@types/jest"] = "^29.5.4";
        packageJson.devDependencies["@types/supertest"] = "^2.0.12";
    }
}