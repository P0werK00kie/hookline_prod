import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";

import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import Loader from "@/components/shared/Loader";
import RequireRole from "@/components/writers/RequireRole";

// Lazy load layouts
const AuthLayout = lazy(() => import("./_auth/AuthLayout"));
const RootLayout = lazy(() => import("./_root/RootLayout"));

// Lazy load auth forms
const SigninForm = lazy(() => import("./_auth/forms/SigninForm"));
const SignupForm = lazy(() => import("./_auth/forms/SignupForm"));

// Lazy load pages
const Home = lazy(() => import("./_root/pages/Home"));
const Explore = lazy(() => import("./_root/pages/Explore"));
const Saved = lazy(() => import("./_root/pages/Saved"));
const AllUsers = lazy(() => import("./_root/pages/AllUsers"));
const CreatePost = lazy(() => import("./_root/pages/CreatePost"));
const EditPost = lazy(() => import("./_root/pages/EditPost"));
const PostDetails = lazy(() => import("./_root/pages/PostDetails"));
const Profile = lazy(() => import("./_root/pages/Profile"));
const UpdateProfile = lazy(() => import("./_root/pages/UpdateProfile"));

// For Writers (role-gated)
const WritersBlock = lazy(() => import("./_root/pages/writers/WritersBlock"));
const MyListing = lazy(() => import("./_root/pages/writers/MyListing"));
const Connections = lazy(() => import("./_root/pages/writers/Connections"));
const GuildMeThroughIt = lazy(() => import("./_root/pages/writers/GuildMeThroughIt"));
const GuideChapter = lazy(() => import("./_root/pages/writers/GuideChapter"));
const GuideChapterEditor = lazy(() => import("./_root/pages/writers/GuideChapterEditor"));
const AdminUsers = lazy(() => import("./_root/pages/admin/AdminUsers"));

// Find Music
const PerfectPitch = lazy(() => import("./_root/pages/music/PerfectPitch"));
const GenreSongs = lazy(() => import("./_root/pages/music/GenreSongs"));
const SongDetail = lazy(() => import("./_root/pages/music/SongDetail"));
const MySongs = lazy(() => import("./_root/pages/music/MySongs"));
const SongEditor = lazy(() => import("./_root/pages/music/SongEditor"));
const HookMe = lazy(() => import("./_root/pages/music/HookMe"));
const MyHookMe = lazy(() => import("./_root/pages/music/MyHookMe"));

const App = () => {
  return (
    <main className="flex h-screen">
      <Suspense
        fallback={
          <div className="flex-center w-full h-full">
            <Loader />
          </div>
        }
      >
        <Routes>
          {/* Public Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/sign-in" element={<SigninForm />} />
            <Route path="/sign-up" element={<SignupForm />} />
          </Route>

          {/* Private Routes */}
          <Route element={<RootLayout />}>
            <Route index element={<Home />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/saved" element={<Saved />} />
            <Route path="/all-users" element={<AllUsers />} />
            <Route path="/create-post" element={<CreatePost />} />
            <Route path="/update-post/:id" element={<EditPost />} />
            <Route path="/posts/:id" element={<PostDetails />} />
            <Route path="/profile/:id/*" element={<Profile />} />
            <Route path="/update-profile/:id" element={<UpdateProfile />} />

            {/* Find Music: every signed-in member */}
            <Route path="/perfect-pitch" element={<PerfectPitch />} />
            <Route path="/perfect-pitch/:genre" element={<GenreSongs />} />
            <Route path="/songs/:id" element={<SongDetail />} />
            <Route path="/hook-me" element={<HookMe />} />
            <Route path="/hook-me/mine" element={<MyHookMe />} />
            <Route path="/connections" element={<Connections />} />
            <Route path="/writers-block/connections" element={<Navigate to="/connections" replace />} />

            {/* Writers and Admins */}
            <Route element={<RequireRole roles={["writer"]} />}>
              <Route path="/writers-block" element={<WritersBlock />} />
              <Route path="/writers-block/listing" element={<MyListing />} />
              <Route path="/my-songs" element={<MySongs />} />
              <Route path="/my-songs/new" element={<SongEditor />} />
              <Route path="/my-songs/:id/edit" element={<SongEditor />} />
              <Route path="/guild-me-through-it" element={<GuildMeThroughIt />} />
              <Route path="/guild-me-through-it/:id" element={<GuideChapter />} />
            </Route>

            {/* Admins only */}
            <Route element={<RequireRole roles={["admin"]} />}>
              <Route path="/guild-me-through-it/new" element={<GuideChapterEditor />} />
              <Route path="/guild-me-through-it/:id/edit" element={<GuideChapterEditor />} />
              <Route path="/admin/users" element={<AdminUsers />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>

      <Toaster />
    </main>
  );
};

export default App;
