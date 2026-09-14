import Image from "next/image";
import BodyText from "./BodyText";

type BadgeProps = {
  name: string;
  image: string;
  lockedImage: string;
  unlocked: boolean;
};

export default function Badge({
  name,
  image,
  lockedImage,
  unlocked,
}: BadgeProps) {
  const badgeImage = unlocked ? image : lockedImage;

  return (
    <div className="flex min-w-0 flex-col items-center text-center">
      <Image
        src={badgeImage}
        alt={unlocked ? `${name} rozeti` : `${name} rozeti kilitli`}
        width={64}
        height={64}
        className="h-16 w-16 object-contain"
      />

      <BodyText
        size="xs"
        tone={unlocked ? "default" : "muted"}
        weight="semibold"
        className="mt-2"
      >
        {name}
      </BodyText>
    </div>
  );
}
