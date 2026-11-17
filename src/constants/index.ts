import { INavLink } from "@/types";

/** "Find Music" links: every signed-in member. */
export const musicLinks: INavLink[] = [
  {
    imgURL: "/assets/icons/music.svg",
    route: "/perfect-pitch",
    label: "Perfect Pitch",
  },
  {
    imgURL: "/assets/icons/hook.svg",
    route: "/hook-me",
    label: "Hook Me",
  },
  {
    imgURL: "/assets/icons/chat.svg",
    route: "/connections",
    label: "Connections",
  },
];

/** "For Writers" links, shown in the sidebar under their own heading. */
export const writerLinks: INavLink[] = [
  {
    imgURL: "/assets/icons/upload.svg",
    route: "/my-songs",
    label: "My Songs",
  },
  {
    imgURL: "/assets/icons/writers-block.svg",
    route: "/writers-block",
    label: "Writers Block",
  },
  {
    imgURL: "/assets/icons/guide.svg",
    route: "/guild-me-through-it",
    label: "Guild Me Through It",
  },
];

export const adminLinks: INavLink[] = [
  {
    imgURL: "/assets/icons/admin.svg",
    route: "/admin/users",
    label: "Users & roles",
  },
];

export const sidebarLinks = [
  {
    imgURL: "/assets/icons/home.svg",
    route: "/",
    label: "Home",
  },
  {
    imgURL: "/assets/icons/wallpaper.svg",
    route: "/explore",
    label: "Explore",
  },
  {
    imgURL: "/assets/icons/people.svg",
    route: "/all-users",
    label: "People",
  },
  {
    imgURL: "/assets/icons/bookmark.svg",
    route: "/saved",
    label: "Saved",
  },
  {
    imgURL: "/assets/icons/gallery-add.svg",
    route: "/create-post",
    label: "Create Post",
  },
];

export const bottombarLinks = [
  {
    imgURL: "/assets/icons/home.svg",
    route: "/",
    label: "Home",
  },
  {
    imgURL: "/assets/icons/music.svg",
    route: "/perfect-pitch",
    label: "Music",
  },
  {
    imgURL: "/assets/icons/writers-block.svg",
    route: "/writers-block",
    label: "Writers",
  },
  {
    imgURL: "/assets/icons/wallpaper.svg",
    route: "/explore",
    label: "Explore",
  },
  {
    imgURL: "/assets/icons/bookmark.svg",
    route: "/saved",
    label: "Saved",
  },
  {
    imgURL: "/assets/icons/gallery-add.svg",
    route: "/create-post",
    label: "Create",
  },
];

export const WRITER_GENRES = [
  "Pop",
  "Country",
  "Folk",
  "Rock",
  "Indie",
  "R&B",
  "Hip-Hop",
  "Gospel",
  "Christian",
  "Jazz",
  "Blues",
  "Soul",
  "Electronic",
  "Latin",
  "Musical Theatre",
];
