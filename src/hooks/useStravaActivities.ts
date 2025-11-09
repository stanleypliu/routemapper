import { useState, useEffect, useMemo } from "react";
import type { Activity } from "@/types/strava";
import { COLORS } from "@/lib/utils";

export function useStravaActivities(accessToken: string | null) {
  const [routes, setRoutes] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [years, setYears] = useState<{ year: number; checked: boolean }[]>([]);
  const [page, setPage] = useState(1);

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

  return {
    routes,
    loading,
    years,
    displayedRoutes,
    fetchMoreActivities,
    handleYearChange,
  };
}
