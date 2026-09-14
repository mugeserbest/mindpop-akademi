"use client";
import type { AvatarItem } from "../data/Avatars";
import Avatar from "./Avatar";
import SectionTitle from "./SectionTitle";
import BodyText from "./BodyText";

type AvatarsCardProps = {
  avatars: AvatarItem[];
  selectedAvatarId: string;
  onSelectAvatar: (avatarId: string) => void;
};

export default function AvatarsCard({
  avatars,
  selectedAvatarId,
  onSelectAvatar,
}: AvatarsCardProps) {
  const unlockedCount = avatars.filter((avatar) => avatar.unlocked).length;

  return (
    <>
      <section className="app-card w-full">
        <SectionTitle
          as="h3"
          title="Avatarlar"
          action={
            <BodyText tone="muted" weight="bold" size="xs">
              {unlockedCount} / {avatars.length} açıldı
            </BodyText>
          }
        />

        <div className="mt-4 flex gap-3 overflow-x-auto pb-2 pt-2 px-2">
          {avatars.map((avatar) => (
            <Avatar
              key={avatar.id}
              name={avatar.name}
              image={avatar.image}
              lockedImage={avatar.lockedImage}
              unlocked={avatar.unlocked}
              selected={avatar.id === selectedAvatarId}
              onSelect={() => {
                if (avatar.unlocked) {
                  onSelectAvatar(avatar.id);
                }
              }}
            />
          ))}
        </div>
      </section>
    </>
  );
}
