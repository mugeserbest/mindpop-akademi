export type AvatarItem = {
  id: string;
  name: string;
  image: string;
  largeImage: string;
  lockedImage?: string;
  unlocked: boolean;
  unlockTheme?: "forest" | "village" | "ocean" | "volcano" | "kingdom";
};
export const avatars: AvatarItem[] = [
  {
    id: "bunny",
    name: "Bunny",
    image: "/images/avatar/bunny-mini.png",
    largeImage: "/images/avatar/bunny.png",
    unlocked: true,
  },
  {
    id: "cat",
    name: "Cat",
    image: "/images/avatar/cat-mini.png",
    largeImage: "/images/avatar/cat.png",
    unlocked: true,
  },
  {
    id: "frog",
    name: "Frog",
    image: "/images/avatar/frog-mini.png",
    largeImage: "/images/avatar/frog.png",
    unlocked: true,
  },
  {
    id: "ghost",
    name: "Ghost",
    image: "/images/avatar/ghost-mini.png",
    largeImage: "/images/avatar/ghost.png",
    unlocked: true,
  },
  {
    id: "pig",
    name: "Pig",
    image: "/images/avatar/pig-mini.png",
    largeImage: "/images/avatar/pig.png",
    unlocked: true,
  },
  {
    id: "orman",
    name: "Orman",
    image: "/images/avatar/orman-mini.png",
    lockedImage: "/images/avatar/orman-mini-locked.png",
    largeImage: "/images/avatar/orman.png",
    unlocked: true,
    // Orman avatarı
    unlockTheme: "forest",
  },
  {
    id: "koy",
    name: "Köy",
    image: "/images/avatar/koy-mini.png",
    lockedImage: "/images/avatar/koy-mini-locked.png",
    largeImage: "/images/avatar/koy.png",
    unlocked: false,
    // Köy avatarı
    unlockTheme: "village",
  },
  {
    id: "okyanus",
    name: "Okyanus",
    image: "/images/avatar/okyanus-mini.png",
    lockedImage: "/images/avatar/okyanus-mini-locked.png",
    largeImage: "/images/avatar/okyanus.png",
    unlocked: false,
    // Okyanus avatarı
    unlockTheme: "ocean",
  },
  {
    id: "volkan",
    name: "Volkan",
    image: "/images/avatar/volkan-mini.png",
    lockedImage: "/images/avatar/volkan-mini-locked.png",
    largeImage: "/images/avatar/volkan.png",
    unlocked: false,
    // Volkan avatarı
    unlockTheme: "volcano",
  },
  {
    id: "krallik",
    name: "Krallık",
    image: "/images/avatar/krallik-mini.png",
    lockedImage: "/images/avatar/krallik-mini-locked.png",
    largeImage: "/images/avatar/krallik.png",
    unlocked: false,
    // Krallık avatarı
    unlockTheme: "kingdom",
  },
];
