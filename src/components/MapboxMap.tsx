import type { Activity } from "@/types/strava";
import { useEffect, useRef, useState } from "react";
import mapboxgl, { type Map } from "mapbox-gl";
import { LoaderIcon } from "lucide-react";
import { decode } from "@googlemaps/polyline-codec";

import { Card } from "./ui/card";

import "mapbox-gl/dist/mapbox-gl.css";

const MapboxMap = ({ accessToken }: { accessToken: string | null }) => {
  const [routes, setRoutes] = useState<Activity[] | null>(null);
  const [loading, setLoading] = useState(false);
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
      } finally {
        setLoading(false);
      }
    };

    if (accessToken) {
      fetchActivities();
    }
  }, [accessToken]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      center: [-122.4194, 37.7749], // Default to San Francisco
      zoom: 10,
      style: "mapbox://styles/mapbox/streets-v11",
    });

    map.on("load", () => {
      if (routes) {
        routes.forEach((route, index) => {
          const routeId = `route_${index}`;
          if (map.getSource(routeId)) return;

          const coordinates = decode(route.map.summary_polyline) || [];

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
                "line-color": "#E34A01",
                "line-width": 2,
              },
            });
          }
        });
      }
    });

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        map.setCenter([position.coords.longitude, position.coords.latitude]);
        map.setZoom(11);
      });
    }

    return () => {
      map.remove();
    };
  }, [routes]);

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
