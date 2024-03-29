import { Request, Response } from 'express'

export const get = (req:Request, res:Response) => {
    res.removeHeader('X-Powered-By')
    res.setHeader('Date', '')
    res.setHeader('Content-Type', '')
    res.setHeader('Content-Length', '')
    res.setHeader('Transfer-Encoding','')
    res.setHeader('Last-Modified', '')
    res.setHeader('c-do-app-origin', '')
    res.setHeader('Set-Cookie', '')
    res.setHeader('Cache-Control', '')
    res.end()
}
