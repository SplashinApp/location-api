import { Request, Response } from 'express'
import {ActivityUpdate, UserLocationUpdate} from "../../../interface/index.js";
import {connectToDB} from "../../../lib/db.server.js";
import format from 'pg-format'
import {PoolClient} from "pg";
import logger from "../../../lib/logger.js";
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
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

    //todo remove for migration period
    let uidFromJwt:string | null
    try{
        uidFromJwt = getUidFromJwt(req)
        if(!uidFromJwt){
            throw new Error("No uid in token")
        }
        console.log(`[${new Date().toUTCString()}] - location received for user::${uidFromJwt}`)
    }catch(e){
        let m = e.message
        console.log(m)
        res.statusCode = 401
        res.send("Unauthorized")
        return
    }
    //todo end

    try{
        const location:UserLocationUpdate = req.body

        //todo remove for migration period
        if(uidFromJwt !== location.user_id){
            res.status(401).send('Unauthorized')
            return
        }
        //todo end

        if(location.event === 'push'){
            console.log(`[${new Date().toUTCString()}]Push received for user::${location.user_id} with uuid::${location.uuid}`)
        }

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

    await insertLocations(arr)
    processing = false
    if(arr.length > 0)
    completions.push({time: now - Date.now(), count: arr.length})
}

const formatLocation = (location:UserLocationUpdate) => {
    return [
        location.user_id,
        location.uuid,
        location.is_moving,
        location.location_updated_at,
        location.latitude,
        location.longitude,
        location.accuracy,
        location.speed,
        location.heading,
        location.altitude,
        location.speed_accuracy,
        location.heading_accuracy,
        location.altitude_accuracy,
        location.ellipsoidal_altitude,
        location.battery_level,
        location.battery_is_charging,
        location.event,
        location.activity,
        location.activity_confidence,
        location.activity_updated_at,
        location.heartbeat_at,
        location.last_updated_at,
        location.city,
        location.name,
        location.region,
        location.street,
        location.country,
        location.district,
        location.timezone,
        location.subregion,
        location.postalCode,
        location.streetNumber,
        location.isoCountryCode,
        location.geolocation_updated_at
    ]
}

const insertLocations = async (updates:UserLocationUpdate[]) => {
    if(updates.length === 0) return
    const fullLocations = updates.filter(location => location.latitude && location.longitude)
    const partialLocations:ActivityUpdate[] = updates.filter(location => !location.latitude && !location.longitude) as unknown as ActivityUpdate[]

    const client = await connectToDB()
    if(!client) return
    try {
        const formattedLocations = fullLocations.map(formatLocation)
        if(formattedLocations.length > 0){
            await processFullLocations(client, formattedLocations)
        }
        const formattedActivities = partialLocations.map(activity => [activity.user_id, activity.activity, activity.activity_confidence, activity.activity_updated_at, activity.last_updated_at])
        if(formattedActivities.length > 0){
            await processActivities(client, formattedActivities)
        }

    } catch (e) {
        console.error(e)
    } finally {
        client.release()
    }
}

const processActivities = async (client: PoolClient, items:any[]) => {
    const query = format(`
            INSERT INTO user_location(
                                      user_id,
                                      activity,
                                      activity_confidence,
                                      activity_updated_at,
                                        last_updated_at
            ) VALUES %L ON CONFLICT (user_id) DO UPDATE
                                    SET activity = EXCLUDED.activity,
                                        activity_confidence = EXCLUDED.activity_confidence,
                                        activity_updated_at = EXCLUDED.activity_updated_at,
                                        last_updated_at = EXCLUDED.last_updated_at 
        `, items)

    await client.query(query)
    curCount += items.length
}

const processFullLocations = async (client: PoolClient, items:any[]) => {

    const query = format(`
            INSERT INTO user_location(
                                      user_id,
                                      uuid,
                                      is_moving,
                                      location_updated_at,
                                      latitude,
                                      longitude,
                                      accuracy,
                                      speed,
                                      heading,
                                      altitude,
                                      speed_accuracy,
                                      heading_accuracy,
                                      altitude_accuracy,
                                      ellipsoidal_altitude,
                                      battery_level,
                                      battery_is_charging,
                                      event,
                                      activity,
                                      activity_confidence,
                                      activity_updated_at,
                                      heartbeat_at,
                                      last_updated_at,
                                      city,
                                      name,
                                      region,
                                      street,
                                      country,
                                      district,
                                      timezone,
                                      subregion,
                                      "postalCode",
                                      "streetNumber",
                                      "isoCountryCode",
                                      geolocation_updated_at
            ) VALUES %L ON CONFLICT (user_id) DO UPDATE
                                    SET uuid = COALESCE(EXCLUDED.uuid, user_location.uuid),
                                        is_moving = COALESCE(EXCLUDED.is_moving, user_location.is_moving),
                                        location_updated_at = COALESCE(EXCLUDED.location_updated_at, user_location.location_updated_at),
                                        latitude = COALESCE(EXCLUDED.latitude, user_location.latitude),
                                        longitude = COALESCE(EXCLUDED.longitude, user_location.longitude),
                                        accuracy = COALESCE(EXCLUDED.accuracy, user_location.accuracy),
                                        speed = COALESCE(EXCLUDED.speed, user_location.speed),
                                        heading = COALESCE(EXCLUDED.heading, user_location.heading),
                                        altitude = COALESCE(EXCLUDED.altitude, user_location.altitude),
                                        speed_accuracy = COALESCE(EXCLUDED.speed_accuracy, user_location.speed_accuracy),
                                        heading_accuracy = COALESCE(EXCLUDED.heading_accuracy, user_location.heading_accuracy),
                                        altitude_accuracy = COALESCE(EXCLUDED.altitude_accuracy, user_location.altitude_accuracy),
                                        ellipsoidal_altitude = COALESCE(EXCLUDED.ellipsoidal_altitude, user_location.ellipsoidal_altitude),
                                        battery_level = COALESCE(EXCLUDED.battery_level, user_location.battery_level),
                                        battery_is_charging = COALESCE(EXCLUDED.battery_is_charging, user_location.battery_is_charging),
                                        event = COALESCE(EXCLUDED.event, user_location.event),
                                        activity = COALESCE(EXCLUDED.activity, user_location.activity),
                                        activity_confidence = COALESCE(EXCLUDED.activity_confidence, user_location.activity_confidence),
                                        activity_updated_at = COALESCE(EXCLUDED.activity_updated_at, user_location.activity_updated_at),
                                        heartbeat_at = COALESCE(EXCLUDED.heartbeat_at, user_location.heartbeat_at),
                                        last_updated_at = COALESCE(EXCLUDED.last_updated_at, user_location.last_updated_at),
                                        city = COALESCE(EXCLUDED.city, user_location.city),
                                        name = COALESCE(EXCLUDED.name, user_location.name),
                                        region = COALESCE(EXCLUDED.region, user_location.region),
                                        street = COALESCE(EXCLUDED.street, user_location.street),
                                        country = COALESCE(EXCLUDED.country, user_location.country),
                                        district = COALESCE(EXCLUDED.district, user_location.district),
                                        timezone = COALESCE(EXCLUDED.timezone, user_location.timezone),
                                        subregion = COALESCE(EXCLUDED.subregion, user_location.subregion),
                                        "postalCode" = COALESCE(EXCLUDED."postalCode", user_location."postalCode"),
                                        "streetNumber" = COALESCE(EXCLUDED."streetNumber", user_location."streetNumber"),
                                        "isoCountryCode" = COALESCE(EXCLUDED."isoCountryCode", user_location."isoCountryCode"),
                                        geolocation_updated_at = COALESCE(EXCLUDED.geolocation_updated_at, user_location.geolocation_updated_at)
        `, items)

    await client.query(query)
    curCount += items.length
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
        msg: `Locations Updated ${curCount}`,
        count: curCount,
        completions: completions.length,
        avg: avg ? Math.round(avg) : 0
    })
    completions = []
    curCount = 0
}, 1000 * 60)
