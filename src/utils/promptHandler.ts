import * as vscode from 'vscode';

export interface ProjectInfo {
    name: string;
    description: string;
    author: string;
    version: string;
    domains: string[];
    includeDocker: boolean;
    includeTests: boolean;
    database: 'mongodb' | 'postgresql' | 'mysql' | 'none';
}

export class PromptHandler {
    static async getProjectInfo(): Promise<ProjectInfo | undefined> {
        try {
            // Nombre del proyecto
            const name = await vscode.window.showInputBox({
                prompt: 'Project name',
                value: 'my-nodejs-project',
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Project name is required';
                    }
                    if (!/^[a-z0-9-]+$/.test(value)) {
                        return 'Use lowercase letters, numbers and hyphens only';
                    }
                    return null;
                }
            });
            if (!name) return undefined;

            // Descripción
            const description = await vscode.window.showInputBox({
                prompt: 'Project description',
                value: 'A Node.js project with Screaming Architecture'
            });
            if (description === undefined) return undefined;

            // Autor
            const author = await vscode.window.showInputBox({
                prompt: 'Author name',
                value: 'Your Name'
            });
            if (author === undefined) return undefined;

            // Dominios iniciales
            const domainsInput = await vscode.window.showInputBox({
                prompt: 'Initial domains (comma-separated)',
                value: 'users,products,orders',
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'At least one domain is required';
                    }
                    return null;
                }
            });
            if (!domainsInput) return undefined;

            const domains = domainsInput.split(',').map(d => d.trim().toLowerCase());

            // Base de datos
            const database = await vscode.window.showQuickPick([
                { label: 'MongoDB', value: 'mongodb' },
                { label: 'PostgreSQL', value: 'postgresql' },
                { label: 'MySQL', value: 'mysql' },
                { label: 'None', value: 'none' }
            ], {
                placeHolder: 'Select database type'
            });
            if (!database) return undefined;

            // Docker
            const includeDocker = await vscode.window.showQuickPick([
                { label: 'Yes', value: true },
                { label: 'No', value: false }
            ], {
                placeHolder: 'Include Docker configuration?'
            });
            if (includeDocker === undefined) return undefined;

            // Tests
            const includeTests = await vscode.window.showQuickPick([
                { label: 'Yes', value: true },
                { label: 'No', value: false }
            ], {
                placeHolder: 'Include test configuration?'
            });
            if (includeTests === undefined) return undefined;

            return {
                name,
                description: description || '',
                author: author || '',
                version: '1.0.0',
                domains,
                includeDocker: includeDocker.value,
                includeTests: includeTests.value,
                database: database.value as any
            };

        } catch (error) {
            vscode.window.showErrorMessage(`Error getting project info: ${error}`);
            return undefined;
        }
    }
}