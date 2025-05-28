// src/utils/fileUtils.ts
import * as fs from 'fs';
import * as path from 'path';

export class FileUtils {
    /**
     * Crea un directorio de forma recursiva si no existe
     */
    static async ensureDirectory(dirPath: string): Promise<void> {
        try {
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
        } catch (error) {
            throw new Error(`Failed to create directory ${dirPath}: ${error}`);
        }
    }

    /**
     * Crea múltiples directorios
     */
    static async createDirectories(basePath: string, directories: string[]): Promise<string[]> {
        const createdDirs: string[] = [];
        
        for (const dir of directories) {
            const fullPath = path.join(basePath, dir);
            await this.ensureDirectory(fullPath);
            createdDirs.push(dir);
        }
        
        return createdDirs;
    }

    /**
     * Escribe un archivo de forma segura
     */
    static async writeFile(filePath: string, content: string): Promise<void> {
        try {
            // Asegurar que el directorio padre existe
            const dir = path.dirname(filePath);
            await this.ensureDirectory(dir);
            
            // Escribir el archivo
            fs.writeFileSync(filePath, content, 'utf8');
        } catch (error) {
            throw new Error(`Failed to write file ${filePath}: ${error}`);
        }
    }

    /**
     * Lee un archivo
     */
    static async readFile(filePath: string): Promise<string> {
        try {
            return fs.readFileSync(filePath, 'utf8');
        } catch (error) {
            throw new Error(`Failed to read file ${filePath}: ${error}`);
        }
    }

    /**
     * Verifica si un archivo o directorio existe
     */
    static exists(filePath: string): boolean {
        return fs.existsSync(filePath);
    }

    /**
     * Copia un archivo
     */
    static async copyFile(sourcePath: string, destinationPath: string): Promise<void> {
        try {
            const dir = path.dirname(destinationPath);
            await this.ensureDirectory(dir);
            fs.copyFileSync(sourcePath, destinationPath);
        } catch (error) {
            throw new Error(`Failed to copy file from ${sourcePath} to ${destinationPath}: ${error}`);
        }
    }

    /**
     * Lista archivos en un directorio
     */
    static listFiles(dirPath: string): string[] {
        try {
            if (!this.exists(dirPath)) {
                return [];
            }
            return fs.readdirSync(dirPath);
        } catch (error) {
            throw new Error(`Failed to list files in ${dirPath}: ${error}`);
        }
    }

    /**
     * Hace un archivo ejecutable (Unix/Linux/Mac)
     */
    static async makeExecutable(filePath: string): Promise<void> {
        try {
            if (process.platform !== 'win32') {
                fs.chmodSync(filePath, '755');
            }
        } catch (error) {
            // Ignorar errores en Windows
            console.warn(`Could not make file executable: ${filePath}`);
        }
    }
}