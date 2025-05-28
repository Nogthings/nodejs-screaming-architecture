// src/extension.ts
import * as vscode from 'vscode';
import { generateProjectCommand } from './commands/generateProject';
import { addDomainCommand } from './commands/addDomain';

export function activate(context: vscode.ExtensionContext) {
    console.log('Node.js Screaming Architecture extension is now active!');

    // Registrar comando principal
    const generateProject = vscode.commands.registerCommand(
        'nodejs-screaming-architecture.generateProject',
        (uri?: vscode.Uri) => generateProjectCommand(uri)
    );

    // Registrar comando para añadir dominio
    const addDomain = vscode.commands.registerCommand(
        'nodejs-screaming-architecture.addDomain',
        () => addDomainCommand()
    );

    // Añadir a subscripciones
    context.subscriptions.push(generateProject, addDomain);

    // Mostrar mensaje de bienvenida (opcional)
    vscode.window.showInformationMessage('Node.js Screaming Architecture generator is ready! 🚀');
}

export function deactivate() {
    console.log('Node.js Screaming Architecture extension is now deactivated');
}