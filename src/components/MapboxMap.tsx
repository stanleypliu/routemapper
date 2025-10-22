import type { Activity } from "@/types/strava";
import { useEffect, useState } from "react";
import Map, { Layer, Source, NavigationControl } from "react-map-gl/mapbox";
import type { MapMouseEvent } from "react-map-gl/mapbox";
import { LoaderIcon } from "lucide-react";
import { decode } from "@googlemaps/polyline-codec";

import { Card } from "./ui/card";

import "mapbox-gl/dist/mapbox-gl.css";

import { COLORS } from "@/lib/utils";

const MapboxMap = ({ accessToken }: { accessToken: string | null }) => {
  const [routes, setRoutes] = useState<Activity[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState("auto");
  const [initialViewState, setInitialViewState] = useState<{
    longitude: number;
    latitude: number;
    zoom: number;
  } | null>(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setInitialViewState({
          longitude: position.coords.longitude,
          latitude: position.coords.latitude,
          zoom: 11,
        });
      });
    }
  }, []);

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
        const routesWithColor = filteredRoutes.map((route) => ({
          ...route,
          color: COLORS[Math.floor(Math.random() * (COLORS.length - 1))],
        }));
        setRoutes(routesWithColor);
      } catch (error) {
        console.error("Error fetching activities:", error);
      }
      setLoading(false);
    };

    if (accessToken) {
      fetchActivities();
    }
  }, [accessToken]);

  const handleMapClick = (e: MapMouseEvent) => {
    if (e.features && e.features.length > 0) {
      const feature = e.features[0];
      console.log("clicked", feature);
    }
  };

  const handlePointerChange = () => {
    cursor === "pointer" ? setCursor("auto") : setCursor("pointer");
  };

  return (
    <div className="w-screen h-screen bg-neutral-400">
      {loading && (
        <Card className="flex-row p-3 bg-white z-10 items-center">
          <LoaderIcon className="animate-spin" />
          <h4 className="text-xl">Loading your routes...</h4>
        </Card>
      )}
      {initialViewState && (
        <Map
          mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
          initialViewState={initialViewState}
          mapStyle="mapbox://styles/mapbox/streets-v11"
          onClick={handleMapClick}
          onMouseEnter={handlePointerChange}
          onMouseLeave={handlePointerChange}
          cursor={cursor}
          interactiveLayerIds={
            routes?.map((_, index) => `route_${index}`) || []
          }
        >
          <NavigationControl />
          {routes &&
            routes.map((route, index) => {
              const routeId = `route_${index}`;
              const coordinates = decode(route.map.summary_polyline).map(
                (coord) => [coord[1], coord[0]]
              );
              const geojson = {
                type: "Feature" as const,
                properties: {},
                geometry: {
                  type: "LineString" as const,
                  coordinates: coordinates,
                },
              };

              return (
                <Source
                  key={routeId}
                  id={routeId}
                  type="geojson"
                  data={geojson}
                >
                  <Layer
                    id={routeId}
                    type="line"
                    paint={{
                      "line-color": route.color,
                      "line-width": 4,
                    }}
                  />
                </Source>
              );
            })}
        </Map>
      )}
    </div>
  );
};

export default MapboxMap;
