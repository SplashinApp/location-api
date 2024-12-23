import { PoolClient } from "pg"
import {ActivityUpdate, UserLocationUpdate } from "../interface/index.js"
import { connectToDB } from "../lib/db.server.js"
import format from "pg-format"

export const insertLocations = async (updates:UserLocationUpdate[], curCount:number) => {
    if(updates.length === 0) return
    const fullLocations = updates.filter(location => location.latitude && location.longitude)
    const partialLocations:ActivityUpdate[] = updates.filter(location => !location.latitude && !location.longitude) as unknown as ActivityUpdate[]

    const client = await connectToDB()
    if(!client) return
    try {
        const formattedLocations = fullLocations.map(formatLocation)
        if(formattedLocations.length > 0){
            await processFullLocations(client, formattedLocations, curCount)
        }
        const formattedActivities = partialLocations.map(activity => [activity.user_id, activity.activity, activity.activity_confidence, activity.activity_updated_at, activity.last_updated_at])
        if(formattedActivities.length > 0){
            await processActivities(client, formattedActivities, curCount)
        }

    } catch (e) {
        console.error(e)
    } finally {
        client.release()
    }
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


const processActivities = async (client: PoolClient, items:any[], curCount:number) => {
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

const processFullLocations = async (client: PoolClient, items:any[], curCount:number) => {

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
