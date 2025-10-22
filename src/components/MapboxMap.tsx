import type { Activity } from "@/types/strava";
import { useEffect, useState } from "react";
import Map, {
  Layer,
  Source,
  NavigationControl,
  Popup,
  type LngLat,
} from "react-map-gl/mapbox";
import type { MapMouseEvent } from "react-map-gl/mapbox";
import { LoaderIcon } from "lucide-react";
import { decode } from "@googlemaps/polyline-codec";

import { Card } from "./ui/card";

import "mapbox-gl/dist/mapbox-gl.css";

import { COLORS } from "@/lib/utils";

const MapboxMap = ({ accessToken }: { accessToken: string | null }) => {
  const [routes, setRoutes] = useState<Activity[] | null>(null);
  const [clickedPoint, setClickedPoint] = useState<LngLat | null>(null);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState("auto");
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null
  );
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
      const clickedRoute = e.features[0].layer?.id;

      if (clickedRoute && routes) {
        setClickedPoint(e.lngLat);
        const index = Number(clickedRoute.split("_")[1]);
        setSelectedActivity(routes[index]);
        console.log(selectedActivity);
      }
    } else {
      setSelectedActivity(null);
    }
  };

  const handlePointerChange = () => {
    cursor === "pointer" ? setCursor("auto") : setCursor("pointer");
  };

  return (
    <div className="w-screen h-screen bg-neutral-400">
      {loading && (
        <div className="absolute top-0 left-0 w-screen h-screen flex justify-center items-center z-20">
          <Card className="flex-row p-3 bg-white items-center w-auto">
            <LoaderIcon className="animate-spin" />
            <h4 className="text-xl">Loading your routes...</h4>
          </Card>
        </div>
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
          style={{ zIndex: 10 }}
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
          {selectedActivity && (
            <Popup
              longitude={clickedPoint?.lng || 100}
              latitude={clickedPoint?.lat || 100}
              key={selectedActivity.id}
              anchor="bottom"
              onClose={() => setSelectedActivity(null)}
            >
              <h4 className="text-lg">{selectedActivity.name}</h4>
              <b>{selectedActivity.start_date}</b>
              <p>{`Distance travelled: ${(
                selectedActivity.distance / 1000
              ).toFixed(2)} km`}</p>
              <p>{`Average heart rate: ${
                selectedActivity.average_heartrate + " BPM" || "N/A"
              }`}</p>
              <p>{`Average speed: ${selectedActivity.average_speed}`}</p>
              <p>{`Kudos ❤️: ${selectedActivity.kudos_count}`}</p>
            </Popup>
          )}
        </Map>
      )}
    </div>
  );
};

export default MapboxMap;
