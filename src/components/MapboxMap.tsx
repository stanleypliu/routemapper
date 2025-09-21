import type { Activity } from "@/types/strava";
import { useEffect, useRef, useState } from "react";
import mapboxgl, { type Map } from "mapbox-gl";
import { LoaderIcon } from "lucide-react";

import { Card } from "./ui/card";

import "mapbox-gl/dist/mapbox-gl.css";

const MapboxMap = ({ accessToken }: { accessToken: string | null }) => {
  const routes = useRef<Activity[] | null>(null);
  const [loading, setLoading] = useState(false);

  const mapRef = useRef<Map | null>(null);
  const mapContainerRef = useRef<HTMLElement | string>("");

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          "https://www.strava.com/api/v3/athlete/activities",
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch activities: ${response.status}`);
        }
        const activities: Activity[] = await response.json();

        routes.current = activities.filter((activity) => !!activity.map);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
        mapRef.current = new mapboxgl.Map({
          container: mapContainerRef.current,
          center: [position.coords.longitude, position.coords.latitude],
          zoom: 11
        });
      });
    } else {
      // TODO - handle via an alert or toast about incompability
      console.log('Geolocation API not available')
    }

    return () => {
      mapRef.current?.remove();
    };
  }, []);

  return (
    <>
      <div
        id="map-container"
        className="w-screen h-screen bg-neutral-400 flex justify-center items-center"
        ref={mapContainerRef}
      >
          {loading && 
          <Card className="flex-row p-3 bg-white z-10 items-center">
            <LoaderIcon className="animate-spin" />
            <h4 className="text-xl">Loading your routes...</h4>
          </Card>
          }
      </div>
    </>
  );
};

export default MapboxMap;
