import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

import { INavLink } from "@/types";
import { adminLinks, musicLinks, sidebarLinks, writerLinks } from "@/constants";
import { hasRole } from "@/lib/roles";
import { Loader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { useSignOutAccount } from "@/lib/react-query/queries";
import { useUserContext, INITIAL_USER } from "@/context/AuthContext";

const LeftSidebar = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, setUser, setIsAuthenticated, isLoading } = useUserContext();

  const { mutate: signOut } = useSignOutAccount();

  const handleSignOut = async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    e.preventDefault();
    signOut();
    setIsAuthenticated(false);
    setUser(INITIAL_USER);
    navigate("/sign-in");
  };

  return (
    <nav className="leftsidebar">
      <div className="flex flex-col gap-8">
        <Link to="/" className="flex gap-3 items-center">
          <img
            src="/assets/images/logo.svg"
            alt="logo"
            width={170}
            height={36}
          />
        </Link>

        {isLoading || !user.email ? (
          <div className="h-14">
            <Loader />
          </div>
        ) : (
          <Link to={`/profile/${user.id}`} className="flex gap-3 items-center">
            <img
              src={user.imageUrl || "/assets/icons/profile-placeholder.svg"}
              alt="profile"
              className="h-14 w-14 rounded-full"
            />
            <div className="flex flex-col">
              <p className="body-bold">{user.name}</p>
              <p className="small-regular text-light-3">@{user.username}</p>
            </div>
          </Link>
        )}

        <ul className="flex flex-col gap-2">
          {sidebarLinks.map((link: INavLink) => (
            <SidebarLink key={link.label} link={link} active={pathname === link.route} />
          ))}
        </ul>

        <NavGroup title="Find Music">
          {musicLinks.map((link) => (
            <SidebarLink key={link.label} link={link} active={pathname.startsWith(link.route)} />
          ))}
        </NavGroup>

        <NavGroup title="For Writers">
          {writerLinks
            // My Songs is only useful to writers; the other links show non-writers how to join.
            .filter((link) => link.route !== "/my-songs" || hasRole(user, "writer"))
            .map((link) => (
              <SidebarLink key={link.label} link={link} active={pathname.startsWith(link.route)} />
            ))}
        </NavGroup>

        {hasRole(user, "admin") && (
          <NavGroup title="Admin">
            {adminLinks.map((link) => (
              <SidebarLink key={link.label} link={link} active={pathname.startsWith(link.route)} />
            ))}
          </NavGroup>
        )}
      </div>

      <Button
        variant="ghost"
        className="shad-button_ghost"
        onClick={(e) => handleSignOut(e)}
      >
        <img src="/assets/icons/logout.svg" alt="logout" />
        <p className="small-medium lg:base-medium">Logout</p>
      </Button>
    </nav>
  );
};

const NavGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-2">
    <p className="px-4 subtle-semibold uppercase tracking-[0.15em] text-light-4">{title}</p>
    <ul className="flex flex-col gap-2">{children}</ul>
  </div>
);

const SidebarLink = ({ link, active }: { link: INavLink; active: boolean }) => (
  <li className={`leftsidebar-link group ${active && "bg-primary-500"}`}>
    <NavLink to={link.route} className="flex gap-4 items-center p-4">
      <img
        src={link.imgURL}
        alt=""
        className={`group-hover:invert-white ${active && "invert-white"}`}
      />
      {link.label}
    </NavLink>
  </li>
);

export default LeftSidebar;
