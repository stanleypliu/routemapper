import { useState, useEffect, useRef } from "react";
import { LoaderIcon } from "lucide-react";

import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Success from "./components/Success";
import MapboxMap from "./components/MapboxMap";

import Background from "@/assets/background.png";

function App() {
  const [currentView, setCurrentView] = useState("homeScreen");
  const [authenticating, setAuthenticating] = useState(false);
  const [checkingAccessToken, setCheckingAccessToken] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const isExchanging = useRef(false);

  useEffect(() => {
    if (
      localStorage.getItem("accessToken") &&
      localStorage.getItem("expiresAt") &&
      localStorage.getItem("refreshToken")
    ) {
      const expiresAt = Number(localStorage.getItem("expiresAt"));
      const accessToken = localStorage.getItem("accessToken");
      setAccessToken(accessToken);

      if (expiresAt * 1000 < Date.now()) {
        exchangeToken();
      }

      setCurrentView("authenticated");
      setCheckingAccessToken(false);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const codeParam = urlParams.get("code");

    if (codeParam && window.opener) {
      window.opener.postMessage(
        { type: "strava-auth-code", code: codeParam },
        window.location.origin
      );
    }

    async function handleAuthMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (
        event.data?.type === "strava-auth-code" &&
        event.data?.code &&
        !isExchanging.current
      ) {
        await exchangeToken(event.data.code);
      }
    }

    async function exchangeToken(code?: string) {
      isExchanging.current = true;
      try {
        const params: Record<string, string> = {
          client_secret: import.meta.env.VITE_CLIENT_SECRET,
          client_id: import.meta.env.VITE_CLIENT_ID,
          grant_type: accessToken ? "refresh_token" : "authorization_code",
        };

        if (!accessToken && code) {
          params.code = code;
        }

        if (accessToken && localStorage.getItem("refresh_token")) {
          params.refresh_token = localStorage.getItem(
            "refresh_token"
          ) as string;
        }

        const response = await fetch("https://www.strava.com/oauth/token", {
          method: "POST",
          body: new URLSearchParams(params),
        });

        if (!response.ok) {
          throw new Error(`Response status: ${response.status}`);
        }

        const result = await response.json();

        localStorage.setItem("accessToken", result.access_token);
        setAccessToken(result.access_token);
        localStorage.setItem("refreshToken", result.refresh_token);
        localStorage.setItem("expiresAt", result.expires_at);
        setCurrentView("authenticated");
      } catch (error: any) {
        console.error(error.message);
      } finally {
        setAuthenticating(false);
        isExchanging.current = false;
      }
    }

    window.addEventListener("message", handleAuthMessage);

    return () => {
      window.removeEventListener("message", handleAuthMessage);
    };
  }, []);

  useEffect(() => {
    if (window.location.pathname === "/success") {
      setCurrentView("success");
    }
  }, [window.location.pathname]);

  function authenticateWithStrava() {
    setAuthenticating(true);

    const oauthUrl = `http://www.strava.com/oauth/authorize?client_id=${
      import.meta.env.VITE_CLIENT_ID
    }&response_type=code&redirect_uri=${
      window.location.href
    }success&approval_prompt=auto&scope=activity:read`;

    window.open(oauthUrl);
  }

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
          {currentView === "success" && <Success />}
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
                    {!!accessToken && checkingAccessToken && (
                      <h2 className="text-2xl text-center font-bold">
                        Checking Access Token...
                      </h2>
                    )}
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    <Button
                      className="uppercase text-white cursor-pointer"
                      onClick={authenticateWithStrava}
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
            <MapboxMap accessToken={accessToken} />
          )}
        </div>
      </div>
    </>
  );
}

export default App;
