import { Request, Response } from 'express'

export const get = (req:Request, res:Response) => {
    res.removeHeader('X-Powered-By')
    res.removeHeader('Date')
    res.removeHeader('Keep-Alive')
    res.removeHeader('Connection')
    res.removeHeader('Content-Type')
    res.removeHeader('Content-Length')
    res.removeHeader('Transfer-Encoding')
    res.removeHeader('Last-Modified')
    res.setHeader('Set-Cookie', '')
    res.send('ok')
}
