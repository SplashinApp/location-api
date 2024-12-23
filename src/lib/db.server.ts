
import dotenv from 'dotenv';
import pkg from 'pg';

dotenv.config({path:`.env.${process.env.NODE_ENV}`})
const { Pool } = pkg;

const config = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: 'postgres',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
    max: 10,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 15000,
}

let pool = new Pool(config);

pool.on('error', async (err, client) => {
    console.error('Unexpected error on idle client', err)
    console.error('Pool Crashed')
    process.exit(-1)
})

export const connectToDB = async () => {
    try{
        return await pool.connect();
    }catch (e) {
        console.error(e)
        return null
    }
}
