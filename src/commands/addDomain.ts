// src/commands/addDomain.ts
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { FileGenerator } from '../utils/fileGenerator';

export async function addDomainCommand() {
    try {
        // Verificar que estamos en un workspace
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('Please open a workspace folder first');
            return;
        }

        // Verificar que es un proyecto Node.js con estructura screaming architecture
        const srcPath = path.join(workspaceFolder.uri.fsPath, 'src');
        if (!fs.existsSync(srcPath)) {
            vscode.window.showErrorMessage('This doesn\'t appear to be a Node.js project with src folder');
            return;
        }

        // Solicitar nombre del dominio
        const domainName = await vscode.window.showInputBox({
            prompt: 'Enter domain name',
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Domain name is required';
                }
                if (!/^[a-z][a-z0-9]*$/.test(value)) {
                    return 'Use lowercase letters and numbers only, starting with a letter';
                }
                
                // Verificar que no existe ya
                const domainPath = path.join(srcPath, value.trim().toLowerCase());
                if (fs.existsSync(domainPath)) {
                    return 'Domain already exists';
                }
                
                return null;
            }
        });

        if (!domainName) return;

        const domain = domainName.trim().toLowerCase();

        // Mostrar progress
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Adding domain "${domain}"...`,
            cancellable: false
        }, async (progress) => {
            
            progress.report({ increment: 25, message: "Creating domain structure..." });
            await createDomainStructure(srcPath, domain);
            
            progress.report({ increment: 50, message: "Generating domain files..." });
            await FileGenerator.generateDomainFiles(path.join(srcPath, domain), domain);
            
            progress.report({ increment: 25, message: "Finalizing..." });
        });

        vscode.window.showInformationMessage(`✅ Domain "${domain}" added successfully!`);

        // Abrir el archivo principal del dominio
        const entityFile = path.join(srcPath, domain, 'domain', 'entities', `${domain.charAt(0).toUpperCase() + domain.slice(1)}.js`);
        if (fs.existsSync(entityFile)) {
            const document = await vscode.workspace.openTextDocument(entityFile);
            await vscode.window.showTextDocument(document);
        }

    } catch (error) {
        vscode.window.showErrorMessage(`Error adding domain: ${error}`);
    }
}

async function createDomainStructure(srcPath: string, domain: string) {
    const directories = [
        `${domain}`,
        `${domain}/application/services`,
        `${domain}/application/use-cases`,
        `${domain}/application/ports`,
        `${domain}/domain/entities`,
        `${domain}/domain/value-objects`,
        `${domain}/domain/events`,
        `${domain}/infrastructure/repositories`,
        `${domain}/infrastructure/controllers`,
        `${domain}/infrastructure/adapters`
    ];

    for (const dir of directories) {
        const fullPath = path.join(srcPath, dir);
        fs.mkdirSync(fullPath, { recursive: true });
    }

    // También crear en tests si existe
    const testsPath = path.join(path.dirname(srcPath), 'tests');
    if (fs.existsSync(testsPath)) {
        fs.mkdirSync(path.join(testsPath, domain), { recursive: true });
    }
}