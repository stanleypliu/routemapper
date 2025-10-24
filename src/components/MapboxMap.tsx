import type { Activity } from "@/types/strava";
import { useEffect, useState, useMemo } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

import "mapbox-gl/dist/mapbox-gl.css";

import { COLORS } from "@/lib/utils";
import { Button } from "./ui/button";

const MapboxMap = ({ accessToken }: { accessToken: string | null }) => {
  const [routes, setRoutes] = useState<Activity[]>([]);
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
  const [years, setYears] = useState<{ year: number; checked: boolean }[]>([]);
  const [page, setPage] = useState(1);

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

  async function fetchMoreActivities() {
    const nextPage = page + 1;
    await fetchActivities(nextPage);
    setPage(nextPage);
  }

  const displayedRoutes = useMemo(() => {
    const selectedYears = years.filter((y) => y.checked).map((y) => y.year);
    return routes.filter((route) =>
      selectedYears.includes(new Date(route.start_date).getFullYear())
    );
  }, [years, routes]);

  async function fetchActivities(page = 1, year?: number) {
    setLoading(true);
    try {
      const url = new URL("https://www.strava.com/api/v3/athlete/activities");

      url.searchParams.append("page", String(page));

      if (year) {
        const startOfYear = Math.floor(new Date(year, 0, 1).getTime() / 1000);
        const endOfYear = Math.floor(
          new Date(year, 11, 31, 23, 59, 59).getTime() / 1000
        );
        url.searchParams.append("before", String(endOfYear));
        url.searchParams.append("after", String(startOfYear));
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch activities: ${response.status}`);
      }
      const activities: Activity[] = await response.json();
      const filteredRoutes = activities.filter(
        (activity) => activity.map && activity.map.summary_polyline
      );
      const routesWithColor = filteredRoutes.map((route) => ({
        ...route,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      }));
      if (!routes || routes.length === 0) {
        setRoutes(routesWithColor);
      } else {
        setRoutes(routes.concat(routesWithColor));
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
    }
    setLoading(false);
  }

  function handleYearChange(year: number) {
    setYears((prevYears) => {
      return prevYears.map((yearObject) =>
        yearObject.year === year
          ? { ...yearObject, checked: !yearObject.checked }
          : yearObject
      );
    });
  }

  useEffect(() => {
    const newYears = [
      ...new Set(
        routes.map((route) => new Date(route.start_date).getFullYear())
      ),
    ];

    setYears((prevYears) => {
      const existingYears = prevYears.map((y) => y.year);
      const yearsToAdd = newYears.filter(
        (year) => !existingYears.includes(year)
      );

      return [
        ...prevYears,
        ...yearsToAdd.map((year) => ({ year, checked: true })),
      ];
    });
  }, [routes]);

  useEffect(() => {
    if (accessToken) {
      fetchActivities();
    }
  }, [accessToken]);

  function handleMapClick(e: MapMouseEvent) {
    if (e.features && e.features.length > 0) {
      const clickedRoute = e.features[0].layer?.id;

      if (clickedRoute && routes) {
        setClickedPoint(e.lngLat);
        const index = Number(clickedRoute.split("_")[1]);
        setSelectedActivity(routes[index]);
      }
    } else {
      setSelectedActivity(null);
    }
  }

  function handlePointerChange() {
    cursor === "pointer" ? setCursor("auto") : setCursor("pointer");
  }

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
      <div className="absolute top-2 left-5 z-20">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Select Year</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {loading && <LoaderIcon className="animate-spin" />}
            {years.length > 0 &&
              years.map((yearObject) => (
                <DropdownMenuCheckboxItem
                  key={yearObject.year}
                  checked={yearObject.checked}
                  onCheckedChange={() => handleYearChange(yearObject.year)}
                  onSelect={(event) => event.preventDefault()}
                >
                  {yearObject.year}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="absolute bottom-2 left-5 z-20">
        <Card className="px-2">
          Showing {displayedRoutes?.length} of {routes?.length} activities
          <Button onClick={fetchMoreActivities}>Load more</Button>
        </Card>
      </div>
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
            displayedRoutes?.map((_, index) => `route_${index}`) || []
          }
          style={{ zIndex: 10 }}
        >
          <></>
          <NavigationControl />
          {displayedRoutes &&
            displayedRoutes.map((route, index) => {
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
              className="activity-popup"
              longitude={clickedPoint?.lng || 100}
              latitude={clickedPoint?.lat || 100}
              key={selectedActivity.id}
              anchor="bottom"
              onClose={() => setSelectedActivity(null)}
            >
              <h4 className="text-lg">{selectedActivity.name}</h4>
              <p className="mb-3 font-bold">{selectedActivity.start_date}</p>
              <p>{`Distance travelled: ${(
                selectedActivity.distance / 1000
              ).toFixed(2)} km`}</p>
              <p>{`Average heart rate: ${
                selectedActivity.average_heartrate
                  ? selectedActivity.average_heartrate + " BPM"
                  : "N/A"
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
