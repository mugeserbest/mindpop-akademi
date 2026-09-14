import Image from "next/image";

type AvatarProps = {
  name: string;
  image: string;
  lockedImage?: string;
  unlocked: boolean;
  selected: boolean;
  onSelect: () => void;
};

export default function Avatar({
  name,
  image,
  lockedImage,
  unlocked,
  selected,
  onSelect,
}: AvatarProps) {
  const avatarImage = unlocked ? image : (lockedImage ?? image);

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!unlocked}
      aria-pressed={selected}
      aria-label={
        unlocked ? `${name} avatarını seç` : `${name} avatarı kilitli`
      }
      className={`flex min-w-20 shrink-0 flex-col items-center rounded-card p-2 text-center transition
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-main-purple
        ${selected ? "bg-cream ring-2 ring-main-purple" : ""}
        ${unlocked ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
    >
      <Image
        src={avatarImage}
        alt=""
        width={64}
        height={64}
        aria-hidden="true"
        className="h-18 w-18 object-contain"
      />

      <span
        className={`mt-1 text-xs font-bold ${
          unlocked ? "text-black" : "text-grey"
        }`}
      >
        {name}
      </span>
    </button>
  );
}
