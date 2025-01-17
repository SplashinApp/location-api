import { Request, Response } from 'express'
import {UserLocationUpdate} from "../../../../interface/index.js";
import logger from "../../../../lib/logger.js";
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import { insertLocations } from '../../../../services/LocationService.js';
dotenv.config({path:`.env.${process.env.NODE_ENV}`})

// We are using a Map to make sure if the same user sends multiple requests, we only keep the latest one
const locations:Map<string, UserLocationUpdate> = new Map()
let curCount = 0
let completions:{
    time: number,
    count: number
}[] = []
let processing = false

function isValid(arg: any): arg is UserLocationUpdate{
    // validate all required fields are present
    try{
        return arg.user_id && typeof arg.user_id === 'string' && arg.user_id.length === 36
    }catch(e){
        logger.error(e)
        return false
    }
}

function getUidFromJwt(req:Request):string|null {
    const token = req.headers.authorization
    if(!token) {
        throw new Error("No token")
    }
    const jwtToken = token.split(' ')[1]
    if(!jwtToken) {
        throw new Error("No token")
    }
    if(!process.env.LOCATION_JWT_SIGNING_KEY) {
        throw new Error("No signing key")
    }
    // validate the token
    const verified:any = jwt.verify(jwtToken, process.env.LOCATION_JWT_SIGNING_KEY)
    if(!verified) {
        throw new Error("Invalid token")
    }
    if(!verified.uid) {
        throw new Error("No uid in token")
    }
    return verified.uid
}

export const post = (req:Request, res:Response) => {

    let uidFromJwt:string | null

    if(Math.random() < 0.01){
        try{
            uidFromJwt = getUidFromJwt(req)
            if(!uidFromJwt){
                throw new Error("No uid in token")
            }
        }catch(e){
            // @ts-ignore
            let m = e.message
            console.log(req.headers.authorization)
            console.log(m)
            // res.statusCode = 401
            // res.send("Unauthorized")
            // return
        }
    }

    try{
        const location:UserLocationUpdate = req.body

        // if(uidFromJwt !== location.user_id){
        //     res.status(401).send('Unauthorized')
        //     return
        // }

        // if(location.event === 'push'){
        //     console.log(`[${new Date().toUTCString()}] Push::${location.user_id}`)
        // }else{
        //     console.log(`[${new Date().toUTCString()}] Location::${location.user_id}`)
        // }

        if(!isValid(location)){
            res.status(400).send('Invalid Request')
            return
        }


        locations.set(location.user_id, location)

        if(locations.size > 300){
             processLocations()
        }
    }catch (e) {
        logger.error(e)
        res.status(500).send('Internal Server Error')
    }


    res.removeHeader('X-Powered-By')
    res.setHeader('Date', '')
    res.setHeader('Last-Modified', '')
    res.end()
}

const processLocations = async() => {
    if(processing) return
    processing = true
    const now = Date.now()
    const queuedMap = new Map(locations)
    locations.clear()
    const arr = Array.from(queuedMap.values())
        .sort((a,b)=> a.user_id.localeCompare(b.user_id))

    curCount = await insertLocations(arr, curCount)
    processing = false
    if(arr.length > 0)
    completions.push({time: now - Date.now(), count: arr.length})
}


setInterval(() => {
    try{
        processLocations()
    }catch (e) {
        logger.warn(e)
    }
}, 1000 * 5)

setInterval(() => {
    const avg = completions.reduce((acc, cur) => acc + cur.count, 0) / completions.length
    logger.info({
        msg: `V3: Locations Updated ${curCount}`,
        count: curCount,
        completions: completions.length,
        avg: avg ? Math.round(avg) : 0
    })
    completions = []
    curCount = 0
}, 1000 * 60)
