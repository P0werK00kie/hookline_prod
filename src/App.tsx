import { Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";

import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import Loader from "@/components/shared/Loader";

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
          </Route>
        </Routes>
      </Suspense>

      <Toaster />
    </main>
  );
};

export default App;
