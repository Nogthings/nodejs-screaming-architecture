// src/extension.ts - VERSIÓN CORREGIDA
import * as vscode from 'vscode';
import { generateProjectCommand } from './commands/generateProject';
import { addDomainCommand } from './commands/addDomain';

export function activate(context: vscode.ExtensionContext) {
    console.log('🚀 Node.js Screaming Architecture extension is now active!');

    try {
        // Registrar comando principal con logging
        const generateProject = vscode.commands.registerCommand(
            'nodejs-screaming-architecture.generateProject',
            async (uri?: vscode.Uri) => {
                console.log('🎯 Generate project command triggered');
                try {
                    await generateProjectCommand(uri);
                } catch (error) {
                    console.error('❌ Error in generateProject command:', error);
                    vscode.window.showErrorMessage(`Error generating project: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }
        );

        // Registrar comando para añadir dominio con logging
        const addDomain = vscode.commands.registerCommand(
            'nodejs-screaming-architecture.addDomain',
            async () => {
                console.log('🎯 Add domain command triggered');
                try {
                    await addDomainCommand();
                } catch (error) {
                    console.error('❌ Error in addDomain command:', error);
                    vscode.window.showErrorMessage(`Error adding domain: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }
        );

        // Añadir a subscripciones
        context.subscriptions.push(generateProject, addDomain);

        // Mostrar mensaje de bienvenida
        vscode.window.showInformationMessage(
            'Node.js Screaming Architecture generator is ready! 🚀', 
            'Generate Project'
        ).then(selection => {
            if (selection === 'Generate Project') {
                vscode.commands.executeCommand('nodejs-screaming-architecture.generateProject');
            }
        });

        console.log('✅ Extension activated successfully');
        console.log('📋 Available commands:');
        console.log('   - nodejs-screaming-architecture.generateProject');
        console.log('   - nodejs-screaming-architecture.addDomain');

    } catch (error) {
        console.error('❌ Error during extension activation:', error);
        vscode.window.showErrorMessage(`Failed to activate extension: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export function deactivate() {
    console.log('👋 Node.js Screaming Architecture extension is now deactivated');
}