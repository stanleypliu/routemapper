export interface Activity {
  average_heartrate: any;
  id: number;
  resource_state: number;
  external_id: string | null;
  upload_id: number | null;
  athlete: Athlete;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  type: string;
  sport_type: string;
  start_date: string;
  start_date_local: string;
  timezone: string;
  utc_offset: number;
  achievement_count: number;
  kudos_count: number;
  comment_count: number;
  athlete_count: number;
  photo_count: number;
  map: Map;
  trainer: boolean;
  commute: boolean;
  manual: boolean;
  private: boolean;
  flagged: boolean;
  gear_id: string | null;
  from_accepted_tag: string | null;
  average_speed: number;
  max_speed: number;
  device_watts: boolean;
  has_heartrate: boolean;
  pr_count: number;
  total_photo_count: number;
  has_kudoed: boolean;
  workout_type: string | null;
  description: string | null;
  calories: number;
  segment_efforts: any[];
  color: string;
}

interface Athlete {
  id: number;
  resource_state: number;
}

export interface Map {
  id: string;
  summary_polyline: string;
  polyline?: string | null;
  resource_state: number;
}
