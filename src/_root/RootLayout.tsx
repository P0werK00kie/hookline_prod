import { Suspense } from "react";
import { Outlet } from "react-router-dom";

import Topbar from "@/components/shared/Topbar";
import Bottombar from "@/components/shared/Bottombar";
import LeftSidebar from "@/components/shared/LeftSidebar";
import MiniPlayer from "@/components/music/MiniPlayer";
import { PlayerProvider } from "@/context/PlayerContext";
import Loader from "@/components/shared/Loader";

const RootLayout = () => {
  return (
    <PlayerProvider>
      <div className="w-full md:flex">
        <Topbar />
        <LeftSidebar />

        <section className="flex flex-1 h-full">
          {/* Lazy pages suspend here, so the layout (and the music player) stays mounted. */}
          <Suspense
            fallback={
              <div className="flex-center w-full h-full">
                <Loader />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </section>

        <MiniPlayer />
        <Bottombar />
      </div>
    </PlayerProvider>
  );
};

export default RootLayout;
