import type { Activity } from "@/types/strava";
import { useEffect, useRef, useState } from "react";
import mapboxgl, { type Map } from "mapbox-gl";
import { LoaderIcon } from "lucide-react";
import { decode } from "@googlemaps/polyline-codec";

import { Card } from "./ui/card";

import "mapbox-gl/dist/mapbox-gl.css";

import { COLORS } from "@/lib/utils";

const MapboxMap = ({ accessToken }: { accessToken: string | null }) => {
  const [routes, setRoutes] = useState<Activity[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [map, setMap] = useState<Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

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
        const filteredRoutes = activities.filter(
          (activity) => activity.map && activity.map.summary_polyline
        );
        setRoutes(filteredRoutes);
      } catch (error) {
        console.error("Error fetching activities:", error);
      }
    };

    if (accessToken) {
      fetchActivities();
    }
  }, [accessToken]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
    const mapInstance = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v11",
    });

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        mapInstance.setCenter([
          position.coords.longitude,
          position.coords.latitude,
        ]);
        mapInstance.setZoom(11);
      });
    }

    setMap(mapInstance);

    return () => {
      mapInstance.remove();
    };
  }, []);

  useEffect(() => {
    if (!map || !routes) return;

    map.on("load", () => {
      routes.forEach((route, index) => {
        const routeId = `route_${index}`;
        if (map.getSource(routeId)) return;

        const coordinates = decode(route.map.summary_polyline).map((coord) => [
          coord[1],
          coord[0],
        ]);

        if (coordinates.length > 0) {
          map.addSource(routeId, {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: coordinates,
              },
            },
          });

          map.addLayer({
            id: routeId,
            type: "line",
            source: routeId,
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-color":
                COLORS[Math.floor(Math.random() * (COLORS.length - 1))],
              "line-width": 2,
            },
          });
        }
      });
    });

    setLoading(false);
  }, [map, routes]);

  return (
    <>
      <div
        id="map-container"
        className="w-screen h-screen bg-neutral-400 flex justify-center items-center"
        ref={mapContainerRef}
      >
        {loading && (
          <Card className="flex-row p-3 bg-white z-10 items-center">
            <LoaderIcon className="animate-spin" />
            <h4 className="text-xl">Loading your routes...</h4>
          </Card>
        )}
      </div>
    </>
  );
};

export default MapboxMap;
