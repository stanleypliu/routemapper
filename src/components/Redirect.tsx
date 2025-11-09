const Redirect = ({ state }: { state: string }) => {
  if (state === "success") {
    return (
      <div>
        Successfully authorized. You can close this page and return to the
        application.
      </div>
    );
  } else if (state === "failure") {
    return <div>Failed to authorize Strava. Please try again.</div>;
  }
};

export default Redirect;
