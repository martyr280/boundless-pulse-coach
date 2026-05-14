import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import MountainMark from "@/components/visual/MountainMark";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center max-w-md">
        <MountainMark className="h-12 w-12 mx-auto mb-6" />
        <span className="eyebrow">Off the trail</span>
        <h1 className="h-display text-5xl mt-3 mb-3">
          404 <span className="font-serif-italic font-normal normal-case tracking-normal text-primary">— lost</span>
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          The page you're looking for doesn't exist. Let's get you back on the path.
        </p>
        <a
          href="/"
          className="inline-flex items-center justify-center h-11 px-6 rounded-full bg-gradient-warm text-primary-foreground font-bold uppercase tracking-[0.18em] text-xs shadow-cinematic hover:-translate-y-0.5 transition-transform"
        >
          Return home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
