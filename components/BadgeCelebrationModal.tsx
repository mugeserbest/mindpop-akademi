"use client";

import Image from "next/image";
import { badges } from "../data/Badges";
import Button from "./button";
import Modal from "./Modal";

type BadgeCelebrationModalProps = {
  badgeKey: string | null;
  reason: string;
  onClose: () => void;
};

export default function BadgeCelebrationModal({
  badgeKey,
  reason,
  onClose,
}: BadgeCelebrationModalProps) {
  const badge = badges.find((item) => item.id === badgeKey);

  if (!badge) {
    return null;
  }

  return (
    <Modal
      open
      title="Yeni rozet kazandın!"
      onClose={onClose}
      headerIcon={
        <Image
          src="/images/pop-icon/kutlayan-icon.png"
          alt=""
          width={48}
          height={48}
          className="h-10 w-10 shrink-0 object-contain"
        />
      }
    >
      <div className="text-center">
        <Image
          src={badge.image}
          alt={`${badge.name} rozeti`}
          width={120}
          height={120}
          className="mx-auto h-28 w-28 object-contain motion-safe:animate-pop-celebration"
        />

        <p className="mt-5 font-body text-base leading-7 text-black">
          Tebrikler! {reason} için <strong>{badge.name}</strong> rozetini
          kazandın.
        </p>

        <p className="mt-3 rounded-card bg-cream px-4 py-3 font-body text-sm font-semibold leading-6 text-main-purple">
          Her küçük adım, büyük bir öğrenme macerasının parçasıdır. Böyle devam
          et!
        </p>

        <Button variant="gold" className="mt-6" onClick={onClose}>
          Harika!
        </Button>
      </div>
    </Modal>
  );
}
