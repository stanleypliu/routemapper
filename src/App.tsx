import { LoaderIcon, AlertCircleIcon, InfoIcon } from "lucide-react";

import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Redirect from "@/components/Redirect";
import MapboxMap from "@/components/MapboxMap";
import { useStravaAuth } from "@/hooks/useStravaAuth";

import Background from "@/assets/background.png";

function App() {
  const {
    currentView,
    authenticating,
    checkingAccessToken,
    accessToken,
    error,
    authenticateWithStrava,
    setCurrentView,
    logout,
  } = useStravaAuth();

  function LoadingSpinner() {
    return authenticating ? <LoaderIcon className="animate-spin" /> : null;
  }

  return (
    <>
      <div className="relative w-screen h-screen">
        {currentView === "homeScreen" && (
          <>
            <div
              className="absolute top-0 left-0 w-full h-full bg-cover bg-no-repeat"
              style={{ backgroundImage: `url(${Background})` }}
            ></div>
            <div className="absolute top-0 left-0 w-full h-full bg-white opacity-70"></div>
          </>
        )}
        <div className="relative z-10">
          {currentView === "success" && <Redirect state="success" />}
          {currentView === "failure" && <Redirect state="failure" />}
          {currentView === "homeScreen" && (
            <div className="flex justify-center items-center w-screen h-screen">
              <div className="min-w-xl">
                <h1 className="text-3xl font-extrabold text-center mb-10">
                  RouteMapper
                </h1>
                <Card>
                  <CardHeader>
                    {!accessToken && (
                      <h2 className="text-2xl text-center font-bold">
                        Authenticate With Strava
                      </h2>
                    )}
                    {accessToken && checkingAccessToken && (
                      <Alert>
                        <InfoIcon />
                        <AlertTitle>Checking Access Token...</AlertTitle>
                      </Alert>
                    )}
                    {error && (
                      <Alert variant="destructive">
                        <AlertCircleIcon />
                        <AlertTitle>An error occurred</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    <Button
                      className="uppercase text-white cursor-pointer"
                      onClick={
                        accessToken
                          ? () => setCurrentView("authenticated")
                          : authenticateWithStrava
                      }
                      disabled={authenticating}
                    >
                      <LoadingSpinner />
                      {authenticating
                        ? "Continue in the other window"
                        : "Let's go!"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
          {currentView === "authenticated" && accessToken && (
            <MapboxMap accessToken={accessToken} logout={logout} />
          )}
        </div>
      </div>
    </>
  );
}

export default App;
