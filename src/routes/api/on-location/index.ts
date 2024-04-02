import { Request, Response } from 'express'
import {ActivityUpdate, UserLocationUpdate} from "../../../interface/index.js";
import {connectToDB} from "../../../lib/db.server.js";
import format from 'pg-format'
import {PoolClient} from "pg";

// We are using a Map to make sure if the same user sends multiple requests, we only keep the latest one
const locations:Map<string, UserLocationUpdate> = new Map()
let curCount = 0

function isValid(arg: any): arg is UserLocationUpdate{
    // validate all required fields are present
    try{
        return arg.user_id && typeof arg.user_id === 'string' && arg.user_id.length === 36
    }catch(e){
        console.error(e)
        return false
    }
}

export const post = (req:Request, res:Response) => {

    try{
        const location:UserLocationUpdate = req.body
        // console.log(`Location Update for user: ${location.user_id} at ${location.last_updated_at} with Activity ${location.activity}`)

        if(!isValid(location)){
            res.status(400).send('Invalid Request')
            return
        }
        locations.set(location.user_id, location)

        if(locations.size > 100){
            processLocations()
        }
    }catch (e) {
        console.error(e)
        res.status(500).send('Internal Server Error')
    }


    res.removeHeader('X-Powered-By')
    res.setHeader('Date', '')
    res.setHeader('Last-Modified', '')
    res.end()
}

const processLocations = () => {
    const queuedMap = new Map(locations)
    locations.clear()
    const arr = Array.from(queuedMap.values())
    insertLocations(arr)

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
                                    SET uuid = EXCLUDED.uuid,
                                        is_moving = EXCLUDED.is_moving,
                                        location_updated_at = EXCLUDED.location_updated_at,
                                        latitude = EXCLUDED.latitude,
                                        longitude = EXCLUDED.longitude,
                                        accuracy = EXCLUDED.accuracy,
                                        speed = EXCLUDED.speed,
                                        heading = EXCLUDED.heading,
                                        altitude = EXCLUDED.altitude,
                                        speed_accuracy = EXCLUDED.speed_accuracy,
                                        heading_accuracy = EXCLUDED.heading_accuracy,
                                        altitude_accuracy = EXCLUDED.altitude_accuracy,
                                        ellipsoidal_altitude = EXCLUDED.ellipsoidal_altitude,
                                        battery_level = EXCLUDED.battery_level,
                                        battery_is_charging = EXCLUDED.battery_is_charging,
                                        event = EXCLUDED.event,
                                        activity = EXCLUDED.activity,
                                        activity_confidence = EXCLUDED.activity_confidence,
                                        activity_updated_at = EXCLUDED.activity_updated_at,
                                        heartbeat_at = EXCLUDED.heartbeat_at,
                                        last_updated_at = EXCLUDED.last_updated_at,
                                        city = EXCLUDED.city,
                                        name = EXCLUDED.name,
                                        region = EXCLUDED.region,
                                        street = EXCLUDED.street,
                                        country = EXCLUDED.country,
                                        district = EXCLUDED.district,
                                        timezone = EXCLUDED.timezone,
                                        subregion = EXCLUDED.subregion,
                                        "postalCode" = EXCLUDED."postalCode",
                                        "streetNumber" = EXCLUDED."streetNumber",
                                        "isoCountryCode" = EXCLUDED."isoCountryCode",
                                        geolocation_updated_at = EXCLUDED.geolocation_updated_at
        `, items)

    await client.query(query)
    curCount += items.length
}

setInterval(() => {
    processLocations()
}, 1000 * 5)

setInterval(() => {
    console.log(`Processed ${curCount} locations in the last 1 minute`)
    curCount = 0
}, 1000 * 60)
