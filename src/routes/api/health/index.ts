import { Request, Response } from 'express'
import dotenv from 'dotenv'
dotenv.config({path:`.env.${process.env.NODE_ENV}`})

export const get = (req:Request, res:Response) => {
    res.removeHeader('X-Powered-By')
    res.setHeader('Date', '')
    res.setHeader('Last-Modified', '')
    console.warn(`TEST: ${process.env.TEST}`)
    res.end()
}
