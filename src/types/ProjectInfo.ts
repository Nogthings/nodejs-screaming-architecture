// src/types/ProjectInfo.ts
export interface ProjectInfo {
    name: string;
    description: string;
    author: string;
    version: string;
    domains: string[];
    includeDocker: boolean;
    includeTests: boolean;
    database: DatabaseType;
}

export type DatabaseType = 'mongodb' | 'postgresql' | 'mysql' | 'none';

export interface DomainInfo {
    name: string;
    capitalizedName: string;
    description?: string;
}

export interface DatabaseConfig {
    type: DatabaseType;
    host: string;
    port: number;
    name: string;
    username?: string;
    password?: string;
    connectionString?: string;
}

export interface DockerConfig {
    enabled: boolean;
    database: DatabaseType;
    includeDevCompose: boolean;
    includeMakefile: boolean;
    includeScripts: boolean;
}