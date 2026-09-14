"use client";

import { useState } from "react";
import Badge from "./Badge";
import Button from "./button";
import Modal from "./Modal";
import SectionTitle from "./SectionTitle";
import BodyText from "./BodyText";

type BadgeItem = {
  id: string;
  name: string;
  image: string;
  lockedImage: string;
  unlocked: boolean;
};

type BadgesCardProps = {
  badges: BadgeItem[];
  type?: "normal" | "wide";
};

export default function BadgesCard({
  badges,
  type = "normal",
}: BadgesCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const unlockedCount = badges.filter((badge) => badge.unlocked).length;
  // Kazanılan rozetleri önce, kilitli rozetleri sonra gösterir.
  // Aynı gruptaki rozetler kendi mevcut sıralarını korur.
  const sortedBadges = [...badges].sort(
    (firstBadge, secondBadge) =>
      Number(secondBadge.unlocked) - Number(firstBadge.unlocked),
  );

  const previewBadges = sortedBadges.slice(0, type === "wide" ? 6 : 4);
  const gridStyles =
    type === "wide"
      ? "mt-6 grid grid-cols-3 gap-3 sm:grid-cols-6 sm:gap-6"
      : "mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4";

  return (
    <>
      <section className="app-card w-full min-w-0">
        <SectionTitle
          as="h3"
          title="Rozetler"
          action={
            <BodyText as="span" size="xs" weight="normal" tone="muted">
              {unlockedCount} / {badges.length} tamamlandı
            </BodyText>
          }
        />

        <div className={gridStyles}>
          {previewBadges.map((badge, index) => (
            <div key={badge.id} className={index >= 3 ? "hidden sm:block" : ""}>
              <Badge {...badge} />
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            variant="secondary"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 text-xs"
          >
            Tümünü Gör
          </Button>
        </div>
      </section>

      <Modal
        open={isModalOpen}
        title="Rozetlerim"
        onClose={() => setIsModalOpen(false)}
      >
        <div className="grid grid-cols-3 gap-5 sm:grid-cols-4 md:grid-cols-5">
          {sortedBadges.map((badge) => (
            <Badge key={badge.id} {...badge} />
          ))}
        </div>
      </Modal>
    </>
  );
}
