import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { FileGenerator } from '../utils/fileGenerator';
import { PromptHandler } from '../utils/promptHandler';

export async function generateProjectCommand(uri?: vscode.Uri) {
    try {
        // Obtener directorio de destino
        const targetPath = await getTargetPath(uri);
        if (!targetPath) return;

        // Obtener información del proyecto
        const projectInfo = await PromptHandler.getProjectInfo();
        if (!projectInfo) return;

        // Mostrar progress bar
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Generating Node.js project...",
            cancellable: false
        }, async (progress) => {
            
            progress.report({ increment: 10, message: "Creating project structure..." });
            await FileGenerator.createProjectStructure(targetPath, projectInfo);
            
            progress.report({ increment: 30, message: "Generating base files..." });
            await FileGenerator.generateBaseFiles(targetPath, projectInfo);
            
            progress.report({ increment: 30, message: "Creating domain templates..." });
            await FileGenerator.generateDomainTemplates(targetPath, projectInfo.domains);
            
            progress.report({ increment: 20, message: "Setting up configuration..." });
            await FileGenerator.generateConfigFiles(targetPath, projectInfo);
            
            progress.report({ increment: 10, message: "Finalizing..." });
        });

        // Abrir el proyecto generado
        const projectUri = vscode.Uri.file(targetPath);
        await vscode.commands.executeCommand('vscode.openFolder', projectUri);
        
        vscode.window.showInformationMessage(
            `✅ Project "${projectInfo.name}" generated successfully!`
        );

    } catch (error) {
        vscode.window.showErrorMessage(`Error generating project: ${error}`);
    }
}

async function getTargetPath(uri?: vscode.Uri): Promise<string | undefined> {
    if (uri && uri.fsPath) {
        return uri.fsPath;
    }
    
    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
        return folders[0].uri.fsPath;
    }
    
    const selected = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
        openLabel: 'Select Project Directory'
    });
    
    return selected ? selected[0].fsPath : undefined;
}