
export type ActivityUpdate = {
    activity: LocationEventType;
    activity_confidence: number;
    activity_updated_at: string;
    last_updated_at: string;
    user_id: string;
}

export type LocationActivityType =
    | 'in_vehicle'
    | 'on_bicycle'
    | 'on_foot'
    | 'running'
    | 'still'
    | 'unknown'
    | 'walking';
export type LocationEventType = 'motionchange' | 'geofence' | 'heartbeat' | 'providerchange';
export interface UserLocationUpdate {
    user_id: string;
    location_updated_at: string | null;
    is_moving: boolean | null;
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    speed?: number;
    heading?: number;
    altitude: number | null;
    speed_accuracy: number | null;
    heading_accuracy: number | null;
    altitude_accuracy: number | null;
    ellipsoidal_altitude: number | null;
    battery_level?: number;
    battery_is_charging: boolean | null;
    uuid: string | null;
    event: LocationEventType | null;
    activity: LocationActivityType | null;
    activity_confidence: number | null;
    activity_updated_at: string | null;
    heartbeat_at: string | null;
    city?: string;
    name?: string;
    region?: string;
    street?: string;
    country?: string;
    district?: string;
    timezone?: string;
    subregion?: string;
    postalCode?: string;
    streetNumber?: string;
    isoCountryCode?: string;
    geolocation_updated_at?: string | null;
    last_updated_at: string | null;
}
