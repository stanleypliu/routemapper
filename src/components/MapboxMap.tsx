import { useEffect, useState } from "react";
import Map, {
  Layer,
  Source,
  NavigationControl,
  Popup,
} from "react-map-gl/mapbox";
import { LoaderIcon } from "lucide-react";
import { decode } from "@googlemaps/polyline-codec";

import { Card } from "./ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { useStravaActivities } from "@/hooks/useStravaActivities";
import { useMapInteraction } from "@/hooks/useMapInteraction";

import "mapbox-gl/dist/mapbox-gl.css";

const MapboxMap = ({
  accessToken,
  logout,
}: {
  accessToken: string | null;
  logout: () => void;
}) => {
  const {
    routes,
    loading,
    years,
    displayedRoutes,
    fetchMoreActivities,
    handleYearChange,
  } = useStravaActivities(accessToken);
  const {
    clickedPoint,
    cursor,
    selectedActivity,
    handleMapClick,
    handlePointerChange,
    closePopup,
  } = useMapInteraction(routes);
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
      {!loading && routes.length === 0 && (
        <div className="absolute top-0 left-0 w-screen h-screen flex justify-center items-center z-20">
          <Card className="flex-row p-3 bg-white items-center w-auto">
            <h4 className="text-xl">
              Unfortunately, there don't seem to be any activities on your
              account.
            </h4>
          </Card>
        </div>
      )}
      <div className="absolute top-2 left-5 z-20">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={!routes || routes.length === 0}>Select Year</Button>
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
      <div className="absolute top-2 left-35 z-20">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Remove my data</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Your data will be removed and you will need to grant Strava
              permission again in order to use Routemapper.
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={logout}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
            displayedRoutes?.map((route) => String(route.id)) || []
          }
          style={{ zIndex: 10 }}
        >
          <></>
          <NavigationControl />
          {displayedRoutes &&
            displayedRoutes.map((route) => {
              const routeId = String(route.id);
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
              onClose={closePopup}
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
