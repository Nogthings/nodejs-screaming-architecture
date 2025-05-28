// src/generators/domain/RepositoryGenerator.ts
import * as path from 'path';
import { BaseFileGenerator } from '../base/BaseFileGenerator';
import { ProjectInfo } from '../../types/ProjectInfo';
import { FileUtils } from '../../utils/fileUtils';

export class RepositoryGenerator extends BaseFileGenerator {
    constructor() {
        super('domain');
    }

    async generate(projectInfo: ProjectInfo, outputPath: string): Promise<void> {
        throw new Error('Use generateForDomain method instead');
    }

    async generateForDomain(domain: string, projectInfo: ProjectInfo, domainPath: string): Promise<void> {
        const capitalizedDomain = domain.charAt(0).toUpperCase() + domain.slice(1);
        
        // Generar interfaz del repositorio
        await this.generateRepositoryInterface(domain, capitalizedDomain, domainPath);
        
        // Generar implementación en memoria (para desarrollo/testing)
        await this.generateMemoryRepository(domain, capitalizedDomain, domainPath);
        
        // Generar implementación específica de base de datos si aplica
        if (projectInfo.database !== 'none') {
            await this.generateDatabaseRepository(domain, capitalizedDomain, domainPath, projectInfo.database);
        }
    }

    private async generateRepositoryInterface(
        domain: string, 
        capitalizedDomain: string, 
        domainPath: string
    ): Promise<void> {
        const repositoryName = `${capitalizedDomain}Repository`;
        const repositoryPath = path.join(domainPath, 'application', 'ports', `${repositoryName}.js`);
        
        const content = `/**
 * ${capitalizedDomain} Repository Interface
 * This interface defines the contract for ${domain} data access
 */
class ${repositoryName} {
    /**
     * Save a ${domain} entity
     * @param {${capitalizedDomain}} ${domain} - The ${domain} entity to save
     * @returns {Promise<${capitalizedDomain}>} The saved ${domain} entity
     */
    async save(${domain}) {
        throw new Error('Method save() must be implemented');
    }

    /**
     * Find a ${domain} by ID
     * @param {string} id - The ${domain} ID
     * @returns {Promise<${capitalizedDomain}|null>} The ${domain} entity or null if not found
     */
    async findById(id) {
        throw new Error('Method findById() must be implemented');
    }

    /**
     * Find all ${domain}s with optional filtering and pagination
     * @param {Object} options - Query options (page, limit, filters, etc.)
     * @returns {Promise<${capitalizedDomain}[]>} Array of ${domain} entities
     */
    async findAll(options = {}) {
        throw new Error('Method findAll() must be implemented');
    }

    /**
     * Find ${domain}s by specific criteria
     * @param {Object} criteria - Search criteria
     * @returns {Promise<${capitalizedDomain}[]>} Array of matching ${domain} entities
     */
    async findBy(criteria) {
        throw new Error('Method findBy() must be implemented');
    }

    /**
     * Update a ${domain} entity
     * @param {string} id - The ${domain} ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<${capitalizedDomain}|null>} The updated ${domain} entity
     */
    async update(id, updateData) {
        throw new Error('Method update() must be implemented');
    }

    /**
     * Delete a ${domain} by ID
     * @param {string} id - The ${domain} ID
     * @returns {Promise<boolean>} True if deleted, false if not found
     */
    async delete(id) {
        throw new Error('Method delete() must be implemented');
    }

    /**
     * Check if a ${domain} exists by ID
     * @param {string} id - The ${domain} ID
     * @returns {Promise<boolean>} True if exists, false otherwise
     */
    async exists(id) {
        throw new Error('Method exists() must be implemented');
    }

    /**
     * Count ${domain}s with optional criteria
     * @param {Object} criteria - Count criteria
     * @returns {Promise<number>} Number of matching ${domain}s
     */
    async count(criteria = {}) {
        throw new Error('Method count() must be implemented');
    }
}

module.exports = ${repositoryName};`;

        await FileUtils.writeFile(repositoryPath, content);
        this.filesCreated.push(path.relative(process.cwd(), repositoryPath));
        console.log(`✅ Generated: ${repositoryName} interface`);
    }

    private async generateMemoryRepository(
        domain: string, 
        capitalizedDomain: string, 
        domainPath: string
    ): Promise<void> {
        const repositoryName = `Memory${capitalizedDomain}Repository`;
        const repositoryPath = path.join(domainPath, 'infrastructure', 'repositories', `${repositoryName}.js`);
        
        const content = `const ${capitalizedDomain}Repository = require('../../application/ports/${capitalizedDomain}Repository');
const ${capitalizedDomain} = require('../../domain/entities/${capitalizedDomain}');

/**
 * In-Memory implementation of ${capitalizedDomain}Repository
 * Useful for development, testing, and prototyping
 */
class ${repositoryName} extends ${capitalizedDomain}Repository {
    constructor() {
        super();
        this.${domain}s = new Map();
        this.currentId = 1;
    }

    async save(${domain}) {
        if (!${domain}.id) {
            ${domain}.id = this.generateId();
        }
        
        this.${domain}s.set(${domain}.id, { ...${domain}.toJSON() });
        return ${capitalizedDomain}.fromJSON(this.${domain}s.get(${domain}.id));
    }

    async findById(id) {
        const ${domain}Data = this.${domain}s.get(id);
        return ${domain}Data ? ${capitalizedDomain}.fromJSON(${domain}Data) : null;
    }

    async findAll(options = {}) {
        const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = options;
        
        let ${domain}s = Array.from(this.${domain}s.values());
        
        // Sort
        ${domain}s.sort((a, b) => {
            const aValue = a[sortBy];
            const bValue = b[sortBy];
            const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            return sortOrder === 'desc' ? -comparison : comparison;
        });
        
        // Paginate
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        ${domain}s = ${domain}s.slice(startIndex, endIndex);
        
        return ${domain}s.map(${domain}Data => ${capitalizedDomain}.fromJSON(${domain}Data));
    }

    async findBy(criteria) {
        const ${domain}s = Array.from(this.${domain}s.values()).filter(${domain} => {
            return Object.keys(criteria).every(key => {
                return ${domain}[key] === criteria[key];
            });
        });
        
        return ${domain}s.map(${domain}Data => ${capitalizedDomain}.fromJSON(${domain}Data));
    }

    async update(id, updateData) {
        const existing = this.${domain}s.get(id);
        if (!existing) {
            return null;
        }
        
        const updated = { ...existing, ...updateData, updatedAt: new Date().toISOString() };
        this.${domain}s.set(id, updated);
        
        return ${capitalizedDomain}.fromJSON(updated);
    }

    async delete(id) {
        return this.${domain}s.delete(id);
    }

    async exists(id) {
        return this.${domain}s.has(id);
    }

    async count(criteria = {}) {
        if (Object.keys(criteria).length === 0) {
            return this.${domain}s.size;
        }
        
        const matching = await this.findBy(criteria);
        return matching.length;
    }

    // Utility methods
    generateId() {
        return (this.currentId++).toString();
    }

    clear() {
        this.${domain}s.clear();
        this.currentId = 1;
    }

    // Development helpers
    seed(${domain}Data) {
        ${domain}Data.forEach(data => {
            const ${domain} = ${capitalizedDomain}.create(data.id || this.generateId(), data.name);
            this.save(${domain});
        });
    }
}

module.exports = ${repositoryName};`;

        await FileUtils.writeFile(repositoryPath, content);
        this.filesCreated.push(path.relative(process.cwd(), repositoryPath));
        console.log(`✅ Generated: ${repositoryName}`);
    }

    private async generateDatabaseRepository(
        domain: string, 
        capitalizedDomain: string, 
        domainPath: string, 
        database: string
    ): Promise<void> {
        const repositoryName = `${this.getDatabasePrefix(database)}${capitalizedDomain}Repository`;
        const repositoryPath = path.join(domainPath, 'infrastructure', 'repositories', `${repositoryName}.js`);
        
        let content = '';
        
        switch (database) {
            case 'mongodb':
                content = this.createMongoRepository(domain, capitalizedDomain, repositoryName);
                break;
            case 'postgresql':
                content = this.createPostgresRepository(domain, capitalizedDomain, repositoryName);
                break;
            case 'mysql':
                content = this.createMysqlRepository(domain, capitalizedDomain, repositoryName);
                break;
            default:
                return; // Skip if database type not supported
        }

        await FileUtils.writeFile(repositoryPath, content);
        this.filesCreated.push(path.relative(process.cwd(), repositoryPath));
        console.log(`✅ Generated: ${repositoryName}`);
    }

    private getDatabasePrefix(database: string): string {
        switch (database) {
            case 'mongodb': return 'Mongo';
            case 'postgresql': return 'Postgres';
            case 'mysql': return 'Mysql';
            default: return '';
        }
    }

    private createMongoRepository(domain: string, capitalizedDomain: string, repositoryName: string): string {
        return `const mongoose = require('mongoose');
const ${capitalizedDomain}Repository = require('../../application/ports/${capitalizedDomain}Repository');
const ${capitalizedDomain} = require('../../domain/entities/${capitalizedDomain}');

// Define MongoDB Schema
const ${domain}Schema = new mongoose.Schema({
    name: { type: String, required: true, maxlength: 255 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

${domain}Schema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

const ${capitalizedDomain}Model = mongoose.model('${capitalizedDomain}', ${domain}Schema);

/**
 * MongoDB implementation of ${capitalizedDomain}Repository
 */
class ${repositoryName} extends ${capitalizedDomain}Repository {
    async save(${domain}) {
        try {
            let ${domain}Doc;
            
            if (${domain}.id) {
                ${domain}Doc = await ${capitalizedDomain}Model.findByIdAndUpdate(
                    ${domain}.id,
                    ${domain}.toJSON(),
                    { new: true, upsert: true }
                );
            } else {
                ${domain}Doc = new ${capitalizedDomain}Model(${domain}.toJSON());
                await ${domain}Doc.save();
            }
            
            return this.toDomainEntity(${domain}Doc);
        } catch (error) {
            throw new Error(\`Failed to save ${domain}: \${error.message}\`);
        }
    }

    async findById(id) {
        try {
            const ${domain}Doc = await ${capitalizedDomain}Model.findById(id);
            return ${domain}Doc ? this.toDomainEntity(${domain}Doc) : null;
        } catch (error) {
            throw new Error(\`Failed to find ${domain}: \${error.message}\`);
        }
    }

    async findAll(options = {}) {
        try {
            const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = options;
            
            const ${domain}Docs = await ${capitalizedDomain}Model
                .find()
                .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
                .limit(limit)
                .skip((page - 1) * limit);
            
            return ${domain}Docs.map(doc => this.toDomainEntity(doc));
        } catch (error) {
            throw new Error(\`Failed to find ${domain}s: \${error.message}\`);
        }
    }

    async delete(id) {
        try {
            const result = await ${capitalizedDomain}Model.findByIdAndDelete(id);
            return result !== null;
        } catch (error) {
            throw new Error(\`Failed to delete ${domain}: \${error.message}\`);
        }
    }

    async exists(id) {
        try {
            const count = await ${capitalizedDomain}Model.countDocuments({ _id: id });
            return count > 0;
        } catch (error) {
            return false;
        }
    }

    async count(criteria = {}) {
        try {
            return await ${capitalizedDomain}Model.countDocuments(criteria);
        } catch (error) {
            throw new Error(\`Failed to count ${domain}s: \${error.message}\`);
        }
    }

    // Helper method to convert MongoDB document to domain entity
    toDomainEntity(doc) {
        return ${capitalizedDomain}.fromJSON({
            id: doc._id.toString(),
            name: doc.name,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt
        });
    }
}

module.exports = ${repositoryName};`;
    }

    private createPostgresRepository(domain: string, capitalizedDomain: string, repositoryName: string): string {
        return `const pool = require('../../../config/database');
const ${capitalizedDomain}Repository = require('../../application/ports/${capitalizedDomain}Repository');
const ${capitalizedDomain} = require('../../domain/entities/${capitalizedDomain}');

/**
 * PostgreSQL implementation of ${capitalizedDomain}Repository
 */
class ${repositoryName} extends ${capitalizedDomain}Repository {
    constructor() {
        super();
        this.tableName = '${domain}.${domain}';
    }

    async save(${domain}) {
        const client = await pool.connect();
        try {
            let query, values, result;
            
            if (${domain}.id) {
                // Update existing
                query = \`
                    UPDATE \${this.tableName} 
                    SET name = $2, updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                    RETURNING *
                \`;
                values = [${domain}.id, ${domain}.name];
            } else {
                // Insert new
                query = \`
                    INSERT INTO \${this.tableName} (id, name, created_at, updated_at)
                    VALUES (gen_random_uuid(), $1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    RETURNING *
                \`;
                values = [${domain}.name];
            }
            
            result = await client.query(query, values);
            return this.toDomainEntity(result.rows[0]);
        } catch (error) {
            throw new Error(\`Failed to save ${domain}: \${error.message}\`);
        } finally {
            client.release();
        }
    }

    async findById(id) {
        const client = await pool.connect();
        try {
            const query = \`SELECT * FROM \${this.tableName} WHERE id = $1\`;
            const result = await client.query(query, [id]);
            
            return result.rows.length > 0 ? this.toDomainEntity(result.rows[0]) : null;
        } catch (error) {
            throw new Error(\`Failed to find ${domain}: \${error.message}\`);
        } finally {
            client.release();
        }
    }

    async findAll(options = {}) {
        const client = await pool.connect();
        try {
            const { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'desc' } = options;
            const offset = (page - 1) * limit;
            
            const query = \`
                SELECT * FROM \${this.tableName}
                ORDER BY \${sortBy} \${sortOrder.toUpperCase()}
                LIMIT $1 OFFSET $2
            \`;
            
            const result = await client.query(query, [limit, offset]);
            return result.rows.map(row => this.toDomainEntity(row));
        } catch (error) {
            throw new Error(\`Failed to find ${domain}s: \${error.message}\`);
        } finally {
            client.release();
        }
    }

    async delete(id) {
        const client = await pool.connect();
        try {
            const query = \`DELETE FROM \${this.tableName} WHERE id = $1\`;
            const result = await client.query(query, [id]);
            return result.rowCount > 0;
        } catch (error) {
            throw new Error(\`Failed to delete ${domain}: \${error.message}\`);
        } finally {
            client.release();
        }
    }

    async exists(id) {
        const client = await pool.connect();
        try {
            const query = \`SELECT 1 FROM \${this.tableName} WHERE id = $1 LIMIT 1\`;
            const result = await client.query(query, [id]);
            return result.rows.length > 0;
        } catch (error) {
            return false;
        } finally {
            client.release();
        }
    }

    async count(criteria = {}) {
        const client = await pool.connect();
        try {
            const query = \`SELECT COUNT(*) as count FROM \${this.tableName}\`;
            const result = await client.query(query);
            return parseInt(result.rows[0].count);
        } catch (error) {
            throw new Error(\`Failed to count ${domain}s: \${error.message}\`);
        } finally {
            client.release();
        }
    }

    // Helper method to convert database row to domain entity
    toDomainEntity(row) {
        return ${capitalizedDomain}.fromJSON({
            id: row.id,
            name: row.name,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        });
    }
}

module.exports = ${repositoryName};`;
    }

    private createMysqlRepository(domain: string, capitalizedDomain: string, repositoryName: string): string {
        return `const pool = require('../../../config/database');
const ${capitalizedDomain}Repository = require('../../application/ports/${capitalizedDomain}Repository');
const ${capitalizedDomain} = require('../../domain/entities/${capitalizedDomain}');

/**
 * MySQL implementation of ${capitalizedDomain}Repository
 */
class ${repositoryName} extends ${capitalizedDomain}Repository {
    constructor() {
        super();
        this.tableName = '${domain}';
    }

    async save(${domain}) {
        try {
            let query, values, result;
            
            if (${domain}.id) {
                // Update existing
                query = \`
                    UPDATE \${this.tableName} 
                    SET name = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                \`;
                values = [${domain}.name, ${domain}.id];
                await pool.execute(query, values);
                
                // Fetch updated record
                const [rows] = await pool.execute(\`SELECT * FROM \${this.tableName} WHERE id = ?\`, [${domain}.id]);
                result = rows[0];
            } else {
                // Insert new
                query = \`
                    INSERT INTO \${this.tableName} (id, name, created_at, updated_at)
                    VALUES (UUID(), ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                \`;
                values = [${domain}.name];
                const [insertResult] = await pool.execute(query, values);
                
                // Fetch inserted record
                const [rows] = await pool.execute(\`SELECT * FROM \${this.tableName} WHERE id = LAST_INSERT_ID()\`);
                result = rows[0];
            }
            
            return this.toDomainEntity(result);
        } catch (error) {
            throw new Error(\`Failed to save ${domain}: \${error.message}\`);
        }
    }

    async findById(id) {
        try {
            const query = \`SELECT * FROM \${this.tableName} WHERE id = ?\`;
            const [rows] = await pool.execute(query, [id]);
            
            return rows.length > 0 ? this.toDomainEntity(rows[0]) : null;
        } catch (error) {
            throw new Error(\`Failed to find ${domain}: \${error.message}\`);
        }
    }

    async findAll(options = {}) {
        try {
            const { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'desc' } = options;
            const offset = (page - 1) * limit;
            
            const query = \`
                SELECT * FROM \${this.tableName}
                ORDER BY \${sortBy} \${sortOrder.toUpperCase()}
                LIMIT ? OFFSET ?
            \`;
            
            const [rows] = await pool.execute(query, [limit, offset]);
            return rows.map(row => this.toDomainEntity(row));
        } catch (error) {
            throw new Error(\`Failed to find ${domain}s: \${error.message}\`);
        }
    }

    async delete(id) {
        try {
            const query = \`DELETE FROM \${this.tableName} WHERE id = ?\`;
            const [result] = await pool.execute(query, [id]);
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(\`Failed to delete ${domain}: \${error.message}\`);
        }
    }

    async exists(id) {
        try {
            const query = \`SELECT 1 FROM \${this.tableName} WHERE id = ? LIMIT 1\`;
            const [rows] = await pool.execute(query, [id]);
            return rows.length > 0;
        } catch (error) {
            return false;
        }
    }

    async count(criteria = {}) {
        try {
            const query = \`SELECT COUNT(*) as count FROM \${this.tableName}\`;
            const [rows] = await pool.execute(query);
            return parseInt(rows[0].count);
        } catch (error) {
            throw new Error(\`Failed to count ${domain}s: \${error.message}\`);
        }
    }

    // Helper method to convert database row to domain entity
    toDomainEntity(row) {
        return ${capitalizedDomain}.fromJSON({
            id: row.id,
            name: row.name,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        });
    }
}

module.exports = ${repositoryName};`;
    }

    getCreatedFiles(): string[] {
        return [...this.filesCreated];
    }
}