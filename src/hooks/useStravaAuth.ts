import { useReducer, useEffect } from "react";

type AuthState = {
  view: "homeScreen" | "authenticated" | "success" | "failure";
  isAuthenticating: boolean;
  isCheckingToken: boolean;
  accessToken: string | null;
  error: string | null;
};

type AuthAction =
  | { type: "AUTHENTICATION_START" }
  | {
      type: "AUTHENTICATION_SUCCESS";
      payload: {
        accessToken: string;
        refreshToken: string;
        expiresAt: number;
      };
    }
  | { type: "AUTHENTICATION_FAILURE"; payload: string }
  | { type: "TOKEN_VALID" }
  | { type: "LOGOUT" }
  | { type: "SET_VIEW"; payload: AuthState["view"] }
  | { type: "TOKEN_CHECK_COMPLETE" };

function getInitialView() {
  if (window.location.pathname.includes("/redirect")) {
    if (window.location.search.includes("error")) {
      return "failure";
    } else {
      return "success";
    }
  } else {
    return "homeScreen";
  }
}

const initialState: AuthState = {
  view: getInitialView(),
  isAuthenticating: false,
  isCheckingToken: true,
  accessToken: localStorage.getItem("accessToken"),
  error: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "AUTHENTICATION_START":
      return { ...state, isAuthenticating: true, error: null };
    case "AUTHENTICATION_SUCCESS":
      localStorage.setItem("accessToken", action.payload.accessToken);
      localStorage.setItem("refreshToken", action.payload.refreshToken);
      localStorage.setItem("expiresAt", String(action.payload.expiresAt));
      return {
        ...state,
        isAuthenticating: false,
        accessToken: action.payload.accessToken,
        view: "authenticated",
      };
    case "AUTHENTICATION_FAILURE":
      return { ...state, isAuthenticating: false, error: action.payload };
    case "TOKEN_VALID":
      return { ...state, isCheckingToken: false, view: "authenticated" };
    case "TOKEN_CHECK_COMPLETE":
      return { ...state, isCheckingToken: false };
    case "LOGOUT":
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("expiresAt");
      return { ...initialState, accessToken: null, isCheckingToken: false };
    case "SET_VIEW":
      return { ...state, view: action.payload };
    default:
      return state;
  }
}

export function useStravaAuth() {
  const [state, dispatch] = useReducer(authReducer, initialState);

  async function exchangeToken(code?: string) {
    try {
      const params: Record<string, string> = {
        client_secret: import.meta.env.VITE_CLIENT_SECRET,
        client_id: import.meta.env.VITE_CLIENT_ID,
        grant_type: state.accessToken ? "refresh_token" : "authorization_code",
      };

      if (!state.accessToken && code) {
        params.code = code;
      }

      if (state.accessToken && localStorage.getItem("refreshToken")) {
        params.refresh_token = localStorage.getItem("refreshToken") as string;
      }

      const response = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        body: new URLSearchParams(params),
      });

      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }

      const result = await response.json();

      dispatch({
        type: "AUTHENTICATION_SUCCESS",
        payload: {
          accessToken: result.access_token,
          refreshToken: result.refresh_token,
          expiresAt: result.expires_at,
        },
      });
    } catch (error: any) {
      console.error(error.message);
      dispatch({ type: "AUTHENTICATION_FAILURE", payload: error.message });
    }
  }

  useEffect(() => {
    if (
      state.accessToken &&
      localStorage.getItem("expiresAt") &&
      localStorage.getItem("refreshToken")
    ) {
      const expiresAt = Number(localStorage.getItem("expiresAt"));

      if (expiresAt * 1000 < Date.now()) {
        exchangeToken();
      } else {
        dispatch({ type: "TOKEN_VALID" });
      }
    } else {
      dispatch({ type: "TOKEN_CHECK_COMPLETE" });
    }

    const urlParams = new URLSearchParams(window.location.search);
    const codeParam = urlParams.get("code");
    const errorParam = urlParams.get("error");

    if (codeParam && window.opener) {
      window.opener.postMessage(
        { type: "strava-auth-code", code: codeParam },
        window.location.origin
      );
    }

    if (errorParam && window.opener) {
      window.opener.postMessage(
        { type: "strava-permission-denied" },
        window.location.origin
      );
    }

    async function handleAuthMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data?.type === "strava-auth-code" && event.data?.code) {
        await exchangeToken(event.data.code);
      }

      if (event.data.type === "strava-permission-denied") {
        dispatch({
          type: "AUTHENTICATION_FAILURE",
          payload:
            "Access denied. You need to give Strava permission to access your activities.",
        });
      }
    }

    window.addEventListener("message", handleAuthMessage);

    return () => {
      window.removeEventListener("message", handleAuthMessage);
    };
  }, []);

  function authenticateWithStrava() {
    dispatch({ type: "AUTHENTICATION_START" });

    const oauthUrl = `http://www.strava.com/oauth/authorize?client_id=${
      import.meta.env.VITE_CLIENT_ID
    }&response_type=code&redirect_uri=${
      window.location.origin
    }/redirect&approval_prompt=auto&scope=activity:read`;

    window.open(oauthUrl);
  }

  function logout() {
    dispatch({ type: "LOGOUT" });
  }

  return {
    currentView: state.view,
    authenticating: state.isAuthenticating,
    checkingAccessToken: state.isCheckingToken,
    accessToken: state.accessToken,
    error: state.error,
    authenticateWithStrava,
    setCurrentView: (view: AuthState["view"]) =>
      dispatch({ type: "SET_VIEW", payload: view }),
    logout,
  };
}
