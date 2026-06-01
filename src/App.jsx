import DatasetAnnotationPage from "./DatasetAnnotationPage";
import ForumPage from "./ForumPage";
import LetterApp from "./LetterApp";
import LetterHelperPage from "./LetterHelperPage";
import ValidatorDashboardPage from "./ValidatorDashboardPage";

function hasRouteSegment(pathname, segment) {
  return new RegExp(`(^|/)${segment}(/|$)`).test(pathname);
}

export default function App() {
  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  const hash = typeof window !== "undefined" ? window.location.hash : "";
  const hashRoute = hash.startsWith("#/") ? hash.slice(1) : "";

  if (hasRouteSegment(path, "validation") || hasRouteSegment(path, "validator")) {
    return <ValidatorDashboardPage />;
  }
  if (hashRoute.startsWith("/validation") || hashRoute.startsWith("/validator")) {
    return <ValidatorDashboardPage />;
  }

  if (hasRouteSegment(path, "forum") || hashRoute.startsWith("/forum")) {
    return <ForumPage />;
  }

  if (hasRouteSegment(path, "letter") || hashRoute.startsWith("/letter")) {
    return <LetterApp />;
  }

  if (hasRouteSegment(path, "helper") || hashRoute.startsWith("/helper")) {
    return <LetterHelperPage />;
  }

  // Default to the dataset tool (also covers /dataset when hosted under that path).
  return <DatasetAnnotationPage />;
}
