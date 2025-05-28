import * as vscode from 'vscode';
import * as path from 'path';
import { ProjectGenerator } from '../generators/ProjectGenerator';
import { PromptHandler } from '../utils/promptHandler';

export async function generateProjectCommand(uri?: vscode.Uri) {
    const projectGenerator = new ProjectGenerator();
    
    try {
        // Obtener directorio de destino
        const targetPath = await getTargetPath(uri);
        if (!targetPath) {
            vscode.window.showWarningMessage('No target directory selected');
            return;
        }

        // Obtener información del proyecto
        const projectInfo = await PromptHandler.getProjectInfo();
        if (!projectInfo) {
            vscode.window.showInformationMessage('Project generation cancelled');
            return;
        }

        // Validar que el directorio de destino no contenga ya un proyecto con el mismo nombre
        const projectPath = path.join(targetPath, projectInfo.name);
        if (await projectExists(projectPath)) {
            const overwrite = await vscode.window.showWarningMessage(
                `A project named "${projectInfo.name}" already exists. Do you want to overwrite it?`,
                'Yes', 'No'
            );
            
            if (overwrite !== 'Yes') {
                vscode.window.showInformationMessage('Project generation cancelled');
                return;
            }
        }

        // Mostrar progress bar con pasos detallados
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Generating ${projectInfo.name}...`,
            cancellable: false
        }, async (progress, token) => {
            
            try {
                progress.report({ increment: 0, message: "Initializing project structure..." });
                
                // Generar el proyecto usando el nuevo generador modular
                await projectGenerator.generateProject(projectInfo, targetPath);
                
                progress.report({ increment: 100, message: "Project generated successfully!" });
                
            } catch (error) {
                throw error;
            }
        });

        // Preguntar si quiere abrir el proyecto
        const openProject = await vscode.window.showInformationMessage(
            `✅ Project "${projectInfo.name}" generated successfully!`,
            'Open Project', 'Show in Explorer'
        );

        if (openProject === 'Open Project') {
            const projectUri = vscode.Uri.file(projectPath);
            await vscode.commands.executeCommand('vscode.openFolder', projectUri);
        } else if (openProject === 'Show in Explorer') {
            await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(targetPath));
        }

        // Mostrar comandos de siguiente paso
        const nextSteps = [
            `cd ${projectInfo.name}`,
            'npm install',
            'cp .env.example .env',
            'npm run dev'
        ];

        vscode.window.showInformationMessage(
            `Next steps:\n${nextSteps.join('\n')}`,
            'Copy Commands'
        ).then(selection => {
            if (selection === 'Copy Commands') {
                vscode.env.clipboard.writeText(nextSteps.join('\n'));
                vscode.window.showInformationMessage('Commands copied to clipboard!');
            }
        });

    } catch (error) {
        console.error('Error generating project:', error);
        
        // Mostrar error específico basado en el tipo
        let errorMessage = 'Failed to generate project';
        
        if (error instanceof Error) {
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
    // Si se llamó desde el menú contextual de una carpeta
    if (uri && uri.fsPath) {
        const stat = await vscode.workspace.fs.stat(uri);
        if (stat.type === vscode.FileType.Directory) {
            return uri.fsPath;
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
        
        if (!useWorkspace) return undefined;
        
        if (useWorkspace.value !== 'choose') {
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
    
    return selected ? selected[0].fsPath : undefined;
}

async function projectExists(projectPath: string): Promise<boolean> {
    try {
        await vscode.workspace.fs.stat(vscode.Uri.file(projectPath));
        return true;
    } catch {
        return false;
    }
}