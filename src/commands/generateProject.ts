// src/commands/generateProject.ts - VERSIÓN CORREGIDA
import * as vscode from 'vscode';
import * as path from 'path';
import { ProjectGenerator } from '../generators/ProjectGenerator';
import { PromptHandler } from '../utils/promptHandler';

export async function generateProjectCommand(uri?: vscode.Uri) {
    console.log('🎯 Starting generateProjectCommand');
    
    try {
        // Obtener directorio de destino
        console.log('📂 Getting target path...');
        const targetPath = await getTargetPath(uri);
        if (!targetPath) {
            console.log('⚠️ No target directory selected');
            vscode.window.showWarningMessage('No target directory selected');
            return;
        }
        console.log(`✅ Target path: ${targetPath}`);

        // Obtener información del proyecto
        console.log('📝 Getting project info...');
        const projectInfo = await PromptHandler.getProjectInfo();
        if (!projectInfo) {
            console.log('ℹ️ Project generation cancelled by user');
            vscode.window.showInformationMessage('Project generation cancelled');
            return;
        }
        console.log(`✅ Project info obtained: ${projectInfo.name}`);

        // Validar que el directorio de destino no contenga ya un proyecto con el mismo nombre
        const projectPath = path.join(targetPath, projectInfo.name);
        console.log(`🔍 Checking if project exists at: ${projectPath}`);
        
        if (await projectExists(projectPath)) {
            const overwrite = await vscode.window.showWarningMessage(
                `A project named "${projectInfo.name}" already exists. Do you want to overwrite it?`,
                'Yes', 'No'
            );
            
            if (overwrite !== 'Yes') {
                console.log('ℹ️ User chose not to overwrite existing project');
                vscode.window.showInformationMessage('Project generation cancelled');
                return;
            }
        }

        // Mostrar progress bar con pasos detallados
        console.log('🚀 Starting project generation...');
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Generating ${projectInfo.name}...`,
            cancellable: false
        }, async (progress, token) => {
            
            try {
                progress.report({ increment: 0, message: "Initializing project generator..." });
                
                // Crear instancia del generador
                const projectGenerator = new ProjectGenerator();
                
                progress.report({ increment: 10, message: "Creating project structure..." });
                
                // Generar el proyecto usando el nuevo generador modular
                console.log('📦 Calling project generator...');
                await projectGenerator.generateProject(projectInfo, targetPath);
                
                progress.report({ increment: 100, message: "Project generated successfully!" });
                console.log('✅ Project generation completed');
                
            } catch (error) {
                console.error('❌ Error during project generation:', error);
                throw error;
            }
        });

        // Preguntar si quiere abrir el proyecto
        const openProject = await vscode.window.showInformationMessage(
            `✅ Project "${projectInfo.name}" generated successfully!`,
            'Open Project', 'Show in Explorer', 'Copy Commands'
        );

        if (openProject === 'Open Project') {
            const projectUri = vscode.Uri.file(projectPath);
            await vscode.commands.executeCommand('vscode.openFolder', projectUri);
        } else if (openProject === 'Show in Explorer') {
            await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(targetPath));
        } else if (openProject === 'Copy Commands') {
            const nextSteps = [
                `cd ${projectInfo.name}`,
                'npm install',
                'cp .env.example .env',
                'npm run dev'
            ];
            await vscode.env.clipboard.writeText(nextSteps.join('\n'));
            vscode.window.showInformationMessage('Commands copied to clipboard!');
        }

    } catch (error) {
        console.error('❌ Error in generateProjectCommand:', error);
        
        // Mostrar error específico basado en el tipo
        let errorMessage = 'Failed to generate project';
        
        if (error instanceof Error) {
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            
            if (error.message.includes('permission')) {
                errorMessage = 'Permission denied. Please check directory permissions.';
            } else if (error.message.includes('ENOSPC')) {
                errorMessage = 'Not enough disk space to generate project.';
            } else if (error.message.includes('ENOENT')) {
                errorMessage = 'Target directory does not exist or is not accessible.';
            } else {
                errorMessage = `Error: ${error.message}`;
            }
        }
        
        vscode.window.showErrorMessage(errorMessage);
    }
}

async function getTargetPath(uri?: vscode.Uri): Promise<string | undefined> {
    console.log('📂 Getting target path, uri provided:', !!uri);
    
    // Si se llamó desde el menú contextual de una carpeta
    if (uri && uri.fsPath) {
        try {
            const stat = await vscode.workspace.fs.stat(uri);
            if (stat.type === vscode.FileType.Directory) {
                console.log('✅ Using URI path:', uri.fsPath);
                return uri.fsPath;
            }
        } catch (error) {
            console.log('⚠️ Error accessing URI path:', error);
        }
    }
    
    // Si hay un workspace abierto, usar la carpeta raíz
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
        const useWorkspace = await vscode.window.showQuickPick([
            { label: 'Use current workspace', value: workspaceFolders[0].uri.fsPath },
            { label: 'Choose different folder', value: 'choose' }
        ], {
            placeHolder: 'Where do you want to create the project?'
        });
        
        if (!useWorkspace) {
            console.log('⚠️ User cancelled workspace selection');
            return undefined;
        }
        
        if (useWorkspace.value !== 'choose') {
            console.log('✅ Using workspace path:', useWorkspace.value);
            return useWorkspace.value;
        }
    }
    
    // Permitir al usuario seleccionar una carpeta
    const selected = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
        openLabel: 'Select Project Directory',
        title: 'Choose directory for new project'
    });
    
    const result = selected ? selected[0].fsPath : undefined;
    console.log('📂 Selected path:', result);
    return result;
}

async function projectExists(projectPath: string): Promise<boolean> {
    try {
        await vscode.workspace.fs.stat(vscode.Uri.file(projectPath));
        console.log('⚠️ Project already exists:', projectPath);
        return true;
    } catch {
        console.log('✅ Project path is available:', projectPath);
        return false;
    }
}