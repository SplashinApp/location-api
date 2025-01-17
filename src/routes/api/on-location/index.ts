import { Request, Response } from 'express'
import {UserLocationUpdate} from "../../../interface/index.js";
import logger from "../../../lib/logger.js";
import dotenv from 'dotenv'
import { insertLocations } from '../../../services/LocationService.js';
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

export const post = (req:Request, res:Response) => {

    try{
        const location:UserLocationUpdate = req.body

        // if(location.event === 'push'){
            // console.log(`[${new Date().toUTCString()}]Push received for user::${location.user_id} with uuid::${location.uuid}`)
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
        msg: `V1: Locations Updated ${curCount}`,
        count: curCount,
        completions: completions.length,
        avg: avg ? Math.round(avg) : 0
    })
    completions = []
    curCount = 0
}, 1000 * 60)
