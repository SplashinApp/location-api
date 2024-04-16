import { Request, Response } from 'express'
import dotenv from 'dotenv'
import logger from "../../../lib/logger.js";
dotenv.config({path:`.env.${process.env.NODE_ENV}`})

export const get = (req:Request, res:Response) => {
    res.removeHeader('X-Powered-By')
    res.setHeader('Date', '')
    res.setHeader('Last-Modified', '')
    logger.info('Health check');
    logger.debug('Debugging health check');
    logger.warn('Warning health check');
    logger.error('Error health check');
    res.send('ok')
}
