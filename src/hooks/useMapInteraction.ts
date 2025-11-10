import { useState } from "react";
import type { LngLat, MapMouseEvent } from "react-map-gl/mapbox";
import type { Activity } from "@/types/strava";
import { formatDateTime } from "@/lib/utils";

export function useMapInteraction(routes: Activity[]) {
  const [clickedPoint, setClickedPoint] = useState<LngLat | null>(null);
  const [cursor, setCursor] = useState("auto");
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null
  );

  function handleMapClick(e: MapMouseEvent) {
    if (e.features && e.features.length > 0) {
      const clickedRoute = e.features[0].layer?.id;

      if (clickedRoute && routes) {
        setClickedPoint(e.lngLat);
        const foundRoute = routes.find(
          (route) => String(route.id) === clickedRoute
        );

        if (foundRoute) {
          setSelectedActivity({
            ...foundRoute,
            start_date: formatDateTime(foundRoute.start_date),
            average_speed: Math.round(foundRoute.average_speed * 3.6),
            max_speed: Math.round(foundRoute.max_speed * 3.6),
          });
        } else {
          setSelectedActivity(null);
        }
      }
    } else {
      setSelectedActivity(null);
    }
  }

  function handlePointerChange() {
    cursor === "pointer" ? setCursor("auto") : setCursor("pointer");
  }

  function closePopup() {
    setSelectedActivity(null);
  }

  return {
    clickedPoint,
    cursor,
    selectedActivity,
    handleMapClick,
    handlePointerChange,
    closePopup,
  };
}
