
import dotenv from 'dotenv';
import pkg from 'pg';

dotenv.config({path:`.env.${process.env.NODE_ENV}`})
const { Pool } = pkg;

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: 'postgres',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
    max: 10,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 10000,
});

export const connectToDB = async () => await pool.connect();
