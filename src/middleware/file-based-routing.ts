import fs from 'fs'
import { Request, Response } from "express";


const ROOT_FOLDER = '../routes/'

async function getDynamicHandler(folder:string) {
    try {
        const files = await fs.promises.readdir(folder)
        const dynamicFile = files.find( fname => {
            return fname.match(/\[[a-zA-Z0-9\._]+\]/)
        })
        if(!dynamicFile) return null
        return {
            file: dynamicFile,
            param: dynamicFile.replace("[", "").replace("].js", "")
        }
    } catch (e) {
        console.log(e)
        return null
    }
}

async function executeRoute(importURL:string, req:Request, resp:Response) {
    try {
        const module = await import(importURL)

        const httpVerb = req.method.toLowerCase()
        let data = null
        if(module[httpVerb]) {
            data = module[httpVerb](req, resp)
        } else {
            data = module.handler(req, resp)
        }

        return data
    } catch (e) {
        console.log(e)
        resp.statusCode = 404
        return false
    }
}
export const fileRouter = async (req:Request, resp:Response) => {
    try{
        let importURL = (ROOT_FOLDER + req.url).replace("//", "/")

        let isFile = fs.existsSync(importURL + '.js')

        if(!isFile) {
            importURL += '/index.js'
        } else {
            importURL += '.js'
        }

        let data = await executeRoute(importURL, req, resp)

        if(data === false) {
            console.log("Checking if we're dealing with a dynamic route...")

            const pathParts = (ROOT_FOLDER + req.url).replace("//", "/").split("/")

            const dynamicParam = pathParts.pop()
            let prevPath = pathParts.join("/")

            // go look for a special file with brackets on its name
            let dynamicHandler = await getDynamicHandler(prevPath)
            if(!dynamicHandler) { // if we can't find it, then it's a 404
                resp.statusCode = 404
                return resp.send("Not found")
            }

            // add the new param to the request parameters
            if(dynamicParam)
                req.params = {...req.params, [dynamicHandler.param]: dynamicParam}

            //execute the new, dynamic route
            data = await executeRoute( [prevPath, dynamicHandler.file].join("/"), req, resp)
            resp.send(data)
        } else {
            resp.send(data)
        }
    }catch (e) {
        console.error(req.url)
        console.error(e)
        resp.statusCode = 500
        resp.send("Internal Server Error")
    }
}
