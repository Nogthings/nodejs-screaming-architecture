// src/utils/fileGenerator.ts - VERSIÓN CORREGIDA
import * as fs from 'fs';
import * as path from 'path';

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

export class FileGenerator {
    static async createProjectStructure(projectPath: string, projectInfo: ProjectInfo): Promise<void> {
        const projectDir = path.join(projectPath, projectInfo.name);
        
        // PRIMERO: Crear directorio del proyecto
        if (!fs.existsSync(projectDir)) {
            fs.mkdirSync(projectDir, { recursive: true });
        }
        
        // SEGUNDO: Crear estructura base
        const directories = [
            'src',
            'src/shared',
            'src/shared/domain',
            'src/shared/domain/events',
            'src/shared/domain/value-objects',
            'src/shared/infrastructure',
            'src/shared/infrastructure/database',
            'src/shared/infrastructure/messaging',
            'src/shared/infrastructure/logging',
            'src/shared/application',
            'src/shared/application/middlewares',
            'config',
            'docs'
        ];

        if (projectInfo.includeTests) {
            directories.push('tests');
        }

        // TERCERO: Crear directorios para cada dominio
        for (const domain of projectInfo.domains) {
            directories.push(
                `src/${domain}`,
                `src/${domain}/application`,
                `src/${domain}/application/services`,
                `src/${domain}/application/use-cases`,
                `src/${domain}/application/ports`,
                `src/${domain}/domain`,
                `src/${domain}/domain/entities`,
                `src/${domain}/domain/value-objects`,
                `src/${domain}/domain/events`,
                `src/${domain}/infrastructure`,
                `src/${domain}/infrastructure/repositories`,
                `src/${domain}/infrastructure/controllers`,
                `src/${domain}/infrastructure/adapters`
            );

            if (projectInfo.includeTests) {
                directories.push(`tests/${domain}`);
            }
        }

        // CUARTO: Crear todas las carpetas
        console.log('Creating directories...');
        for (const dir of directories) {
            const fullPath = path.join(projectDir, dir);
            try {
                fs.mkdirSync(fullPath, { recursive: true });
                console.log(`✅ Created: ${dir}`);
            } catch (error) {
                console.error(`❌ Failed to create: ${dir}`, error);
                throw error;
            }
        }
    }

    static async generateBaseFiles(projectPath: string, projectInfo: ProjectInfo): Promise<void> {
        const projectDir = path.join(projectPath, projectInfo.name);

        // Verificar que el directorio existe
        if (!fs.existsSync(projectDir)) {
            throw new Error(`Project directory does not exist: ${projectDir}`);
        }

        try {
            // package.json
            const packageJson = {
                name: projectInfo.name,
                version: projectInfo.version,
                description: projectInfo.description,
                main: "src/server.js",
                scripts: {
                    start: "node src/server.js",
                    dev: "nodemon src/server.js",
                    ...(projectInfo.includeTests && { test: "jest" })
                },
                author: projectInfo.author,
                dependencies: {
                    express: "^4.18.2",
                    cors: "^2.8.5",
                    helmet: "^7.0.0",
                    dotenv: "^16.3.1",
                    ...(projectInfo.database === 'mongodb' && { mongoose: "^7.5.0" }),
                    ...(projectInfo.database === 'postgresql' && { pg: "^8.11.3" }),
                    ...(projectInfo.database === 'mysql' && { mysql2: "^3.6.0" })
                },
                devDependencies: {
                    nodemon: "^3.0.1",
                    ...(projectInfo.includeTests && {
                        jest: "^29.6.4",
                        supertest: "^6.3.3"
                    })
                }
            };

            const packageJsonPath = path.join(projectDir, 'package.json');
            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
            console.log('✅ Created: package.json');

            // server.js
            const serverContent = this.generateServerTemplate(projectInfo);
            const serverPath = path.join(projectDir, 'src', 'server.js');
            fs.writeFileSync(serverPath, serverContent);
            console.log('✅ Created: src/server.js');

            // README.md
            const readmeContent = this.generateReadmeTemplate(projectInfo);
            fs.writeFileSync(path.join(projectDir, 'README.md'), readmeContent);
            console.log('✅ Created: README.md');

            // .env example
            const envContent = this.generateEnvTemplate(projectInfo);
            fs.writeFileSync(path.join(projectDir, '.env.example'), envContent);
            console.log('✅ Created: .env.example');

            // .gitignore
            const gitignoreContent = `node_modules/
.env
.DS_Store
logs/
*.log
coverage/
dist/
build/
.vscode-test/
out/`;
            fs.writeFileSync(path.join(projectDir, '.gitignore'), gitignoreContent);
            console.log('✅ Created: .gitignore');

            // Docker files si es necesario
            if (projectInfo.includeDocker) {
                this.generateDockerFiles(projectDir, projectInfo);
            }

        } catch (error) {
            console.error('❌ Error generating base files:', error);
            throw error;
        }
    }

    static async generateDomainTemplates(projectDir: string, domains: string[]): Promise<void> {
        const srcPath = path.join(projectDir, 'src');
        
        console.log('Generating domain templates...');
        console.log(`Source path: ${srcPath}`);
        
        for (const domain of domains) {
            const domainPath = path.join(srcPath, domain);
            console.log(`📁 Generating domain: ${domain} at ${domainPath}`);
            
            // Verificar que el directorio del dominio existe
            if (!fs.existsSync(domainPath)) {
                console.error(`❌ Domain directory does not exist: ${domainPath}`);
                console.error(`Available directories in src:`, fs.readdirSync(srcPath));
                throw new Error(`Domain directory does not exist: ${domainPath}`);
            }
            
            await this.generateDomainFiles(domainPath, domain);
        }
    }

    static async generateConfigFiles(projectDir: string, projectInfo: ProjectInfo): Promise<void> {
        const configDir = path.join(projectDir, 'config');
        
        console.log(`Generating config files in: ${configDir}`);
        
        // Verificar que el directorio config existe
        if (!fs.existsSync(configDir)) {
            console.error(`❌ Config directory does not exist: ${configDir}`);
            console.error(`Available directories in project:`, fs.readdirSync(projectDir));
            throw new Error(`Config directory does not exist: ${configDir}`);
        }

        try {
            // database.js
            const databaseConfig = this.generateDatabaseConfig(projectInfo.database);
            fs.writeFileSync(path.join(configDir, 'database.js'), databaseConfig);
            console.log('✅ Created: config/database.js');

            // server.js
            const serverConfig = `module.exports = {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }
};`;
            fs.writeFileSync(path.join(configDir, 'server.js'), serverConfig);
            console.log('✅ Created: config/server.js');

        } catch (error) {
            console.error('❌ Error generating config files:', error);
            throw error;
        }
    }

    static async generateDomainFiles(domainPath: string, domainName: string): Promise<void> {
        const capitalizedDomain = domainName.charAt(0).toUpperCase() + domainName.slice(1);
        
        try {
            // Verificar que todas las carpetas necesarias existen
            const requiredDirs = [
                'domain/entities',
                'application/use-cases',
                'application/ports',
                'infrastructure/controllers',
                'infrastructure'
            ];

            for (const dir of requiredDirs) {
                const fullPath = path.join(domainPath, dir);
                if (!fs.existsSync(fullPath)) {
                    console.error(`❌ Required directory missing: ${fullPath}`);
                    fs.mkdirSync(fullPath, { recursive: true });
                    console.log(`✅ Created missing directory: ${dir}`);
                }
            }

            // 1. Entity
            const entityContent = `class ${capitalizedDomain} {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }

    updateName(newName) {
        if (!newName || newName.trim().length === 0) {
            throw new Error('Name cannot be empty');
        }
        this.name = newName;
        this.updatedAt = new Date();
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

module.exports = ${capitalizedDomain};`;

            const entityPath = path.join(domainPath, 'domain', 'entities', `${capitalizedDomain}.js`);
            fs.writeFileSync(entityPath, entityContent);
            console.log(`✅ Created: ${domainName}/domain/entities/${capitalizedDomain}.js`);

            // 2. Use Case
            const useCaseContent = `const ${capitalizedDomain} = require('../../domain/entities/${capitalizedDomain}');

class Create${capitalizedDomain}UseCase {
    constructor(${domainName}Repository, eventBus) {
        this.${domainName}Repository = ${domainName}Repository;
        this.eventBus = eventBus;
    }

    async execute(${domainName}Data) {
        // Validate input
        if (!${domainName}Data.name) {
            throw new Error('Name is required');
        }

        // Create entity
        const ${domainName} = new ${capitalizedDomain}(
            ${domainName}Data.id || this.generateId(),
            ${domainName}Data.name
        );

        // Save to repository
        const saved${capitalizedDomain} = await this.${domainName}Repository.save(${domainName});

        // Publish domain event (if eventBus is available)
        if (this.eventBus) {
            await this.eventBus.publish({
                type: '${capitalizedDomain}Created',
                data: saved${capitalizedDomain}.toJSON(),
                timestamp: new Date()
            });
        }

        return saved${capitalizedDomain};
    }

    generateId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }
}

module.exports = Create${capitalizedDomain}UseCase;`;

            const useCasePath = path.join(domainPath, 'application', 'use-cases', `Create${capitalizedDomain}UseCase.js`);
            fs.writeFileSync(useCasePath, useCaseContent);
            console.log(`✅ Created: ${domainName}/application/use-cases/Create${capitalizedDomain}UseCase.js`);

            // 3. Repository interface
            const repositoryContent = `class ${capitalizedDomain}Repository {
    async save(${domainName}) {
        throw new Error('Method not implemented');
    }

    async findById(id) {
        throw new Error('Method not implemented');
    }

    async findAll() {
        throw new Error('Method not implemented');
    }

    async delete(id) {
        throw new Error('Method not implemented');
    }
}

module.exports = ${capitalizedDomain}Repository;`;

            const repositoryPath = path.join(domainPath, 'application', 'ports', `${capitalizedDomain}Repository.js`);
            fs.writeFileSync(repositoryPath, repositoryContent);
            console.log(`✅ Created: ${domainName}/application/ports/${capitalizedDomain}Repository.js`);

            // 4. Controller
            const controllerContent = `const Create${capitalizedDomain}UseCase = require('../application/use-cases/Create${capitalizedDomain}UseCase');

class ${capitalizedDomain}Controller {
    constructor(${domainName}Repository, eventBus) {
        this.create${capitalizedDomain}UseCase = new Create${capitalizedDomain}UseCase(${domainName}Repository, eventBus);
    }

    async create(req, res) {
        try {
            const ${domainName} = await this.create${capitalizedDomain}UseCase.execute(req.body);
            res.status(201).json({
                success: true,
                data: ${domainName}.toJSON()
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    async getAll(req, res) {
        try {
            res.json({
                success: true,
                data: [],
                message: 'Get all ${domainName}s - To be implemented'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    async getById(req, res) {
        try {
            const { id } = req.params;
            res.json({
                success: true,
                data: { id, message: 'Get ${domainName} by ID - To be implemented' }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = ${capitalizedDomain}Controller;`;

            const controllerPath = path.join(domainPath, 'infrastructure', 'controllers', `${capitalizedDomain}Controller.js`);
            fs.writeFileSync(controllerPath, controllerContent);
            console.log(`✅ Created: ${domainName}/infrastructure/controllers/${capitalizedDomain}Controller.js`);

            // 5. Routes
            const routesContent = `const express = require('express');
const router = express.Router();

// TODO: Setup dependency injection
// const ${capitalizedDomain}Controller = require('./controllers/${capitalizedDomain}Controller');
// const ${domainName}Repository = new Memory${capitalizedDomain}Repository();
// const eventBus = new EventBus();
// const ${domainName}Controller = new ${capitalizedDomain}Controller(${domainName}Repository, eventBus);

// Health check for this domain
router.get('/health', (req, res) => {
    res.json({ 
        domain: '${domainName}',
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// CRUD endpoints (to be implemented with dependency injection)
router.post('/', (req, res) => {
    res.status(501).json({ 
        message: 'Create ${domainName} endpoint - Setup dependency injection first',
        domain: '${domainName}',
        method: 'POST'
    });
});

router.get('/', (req, res) => {
    res.json({ 
        message: 'Get all ${domainName}s endpoint - Setup dependency injection first',
        domain: '${domainName}',
        method: 'GET'
    });
});

router.get('/:id', (req, res) => {
    res.json({ 
        message: 'Get ${domainName} by ID endpoint - Setup dependency injection first',
        domain: '${domainName}',
        method: 'GET',
        id: req.params.id
    });
});

router.put('/:id', (req, res) => {
    res.status(501).json({ 
        message: 'Update ${domainName} endpoint - Setup dependency injection first',
        domain: '${domainName}',
        method: 'PUT',
        id: req.params.id
    });
});

router.delete('/:id', (req, res) => {
    res.status(501).json({ 
        message: 'Delete ${domainName} endpoint - Setup dependency injection first',
        domain: '${domainName}',
        method: 'DELETE',
        id: req.params.id
    });
});

module.exports = router;`;

            const routesPath = path.join(domainPath, 'infrastructure', 'routes.js');
            fs.writeFileSync(routesPath, routesContent);
            console.log(`✅ Created: ${domainName}/infrastructure/routes.js`);

        } catch (error) {
            console.error(`❌ Error generating domain files for ${domainName}:`, error);
            throw error;
        }
    }

    // Mantener todos los métodos anteriores (generateServerTemplate, etc.)
    static generateServerTemplate(projectInfo: ProjectInfo): string {
        return `const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: '${projectInfo.name}',
        version: '${projectInfo.version}'
    });
});

// Routes
${projectInfo.domains.map(domain => 
`const ${domain}Routes = require('./${domain}/infrastructure/routes');
app.use('/api/${domain}', ${domain}Routes);`).join('\n')}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Route not found',
        availableRoutes: [
            'GET /health',
${projectInfo.domains.map(domain => `            'GET /api/${domain}/health'`).join(',\n')}
        ]
    });
});

app.listen(PORT, () => {
    console.log(\`🚀 Server running on port \${PORT}\`);
    console.log(\`📚 Health check: http://localhost:\${PORT}/health\`);
    console.log(\`📱 Available domains:\`);
${projectInfo.domains.map(domain => `    console.log(\`   - http://localhost:\${PORT}/api/${domain}/health\`);`).join('\n')}
});

module.exports = app;`;
    }

    static generateReadmeTemplate(projectInfo: ProjectInfo): string {
        return `# ${projectInfo.name}

${projectInfo.description}

## 🏗️ Architecture

This project follows **Screaming Architecture** and **Domain-Driven Design (DDD)** principles.

### Project Structure

\`\`\`
src/
${projectInfo.domains.map(domain => `├── ${domain}/              # ${domain.charAt(0).toUpperCase() + domain.slice(1)} domain
│   ├── application/      # Use cases and services
│   ├── domain/          # Business logic
│   └── infrastructure/  # External concerns`).join('\n')}
└── shared/              # Shared code
\`\`\`

## 🚀 Getting Started

\`\`\`bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev

# Start production server
npm start
\`\`\`

## 📚 API Endpoints

### Health Checks
- \`GET /health\` - Main health check
${projectInfo.domains.map(domain => `- \`GET /api/${domain}/health\` - ${domain.charAt(0).toUpperCase() + domain.slice(1)} domain health`).join('\n')}

### Domain Endpoints
${projectInfo.domains.map(domain => `
#### ${domain.charAt(0).toUpperCase() + domain.slice(1)}
- \`POST /api/${domain}\` - Create ${domain}
- \`GET /api/${domain}\` - Get all ${domain}s
- \`GET /api/${domain}/:id\` - Get ${domain} by ID
- \`PUT /api/${domain}/:id\` - Update ${domain}
- \`DELETE /api/${domain}/:id\` - Delete ${domain}`).join('\n')}

## 🏗️ Domains

${projectInfo.domains.map(domain => `### ${domain.charAt(0).toUpperCase() + domain.slice(1)}
- **Entities**: Core business objects
- **Use Cases**: Application business rules  
- **Services**: Domain services
- **Repositories**: Data access interfaces`).join('\n\n')}

## 🌟 Features

- ✅ Clean Architecture
- ✅ Domain-Driven Design
- ✅ Express.js REST API
- ✅ Environment configuration
${projectInfo.includeDocker ? '- ✅ Docker support' : ''}
${projectInfo.includeTests ? '- ✅ Testing setup' : ''}
- ✅ Error handling
- ✅ CORS and Security headers

## 👤 Author

${projectInfo.author}

## 📄 License

MIT`;
    }

    static generateEnvTemplate(projectInfo: ProjectInfo): string {
        let content = `NODE_ENV=development
PORT=3000
APP_NAME=${projectInfo.name}

# API Configuration
API_VERSION=v1
API_PREFIX=/api

`;

        if (projectInfo.database === 'mongodb') {
            content += `# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/${projectInfo.name}
`;
        } else if (projectInfo.database === 'postgresql') {
            content += `# PostgreSQL Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/${projectInfo.name}
DB_HOST=localhost
DB_PORT=5432
DB_NAME=${projectInfo.name}
DB_USER=username
DB_PASSWORD=password
`;
        } else if (projectInfo.database === 'mysql') {
            content += `# MySQL Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=${projectInfo.name}
DB_USER=username
DB_PASSWORD=password
`;
        }

        content += `
# JWT Configuration (if needed)
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# External Services (if needed)
# EMAIL_SERVICE_API_KEY=
# PAYMENT_GATEWAY_KEY=
`;

        return content;
    }

    static generateDockerFiles(projectDir: string, projectInfo: ProjectInfo): void {
        try {
            // Dockerfile
            const dockerfile = `FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

USER node

CMD ["npm", "start"]`;

            fs.writeFileSync(path.join(projectDir, 'Dockerfile'), dockerfile);
            console.log('✅ Created: Dockerfile');

            // docker-compose.yml básico
            const dockerCompose = `version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    volumes:
      - .:/app
      - /app/node_modules`;

            fs.writeFileSync(path.join(projectDir, 'docker-compose.yml'), dockerCompose);
            console.log('✅ Created: docker-compose.yml');

        } catch (error) {
            console.error('❌ Error generating Docker files:', error);
            throw error;
        }
    }

    static generateDatabaseConfig(database: string): string {
        switch (database) {
            case 'mongodb':
                return `const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(\`MongoDB Connected: \${conn.connection.host}\`);
    } catch (error) {
        console.error('Database connection error:', error);
        process.exit(1);
    }
};

module.exports = connectDB;`;

            case 'postgresql':
                return `const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

pool.on('connect', () => {
    console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('Database connection error:', err);
    process.exit(-1);
});

module.exports = pool;`;

            case 'mysql':
                return `const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test connection
pool.getConnection()
    .then(connection => {
        console.log('Connected to MySQL database');
        connection.release();
    })
    .catch(err => {
        console.error('Database connection error:', err);
    });

module.exports = pool;`;

            default:
                return `// No database configuration needed
// This project is configured without a database
module.exports = {};`;
        }
    }
}