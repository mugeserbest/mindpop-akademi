import Image from "next/image";

type ProcessingOverlayProps = {
  title: string;
  description: string;
  variant?: "default" | "world-celebration";
};

export default function ProcessingOverlay({
  title,
  description,
  variant = "default",
}: ProcessingOverlayProps) {
  const isWorldCelebration = variant === "world-celebration";

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-main-purple/25 p-4 backdrop-blur-sm"
      role="status"
      aria-live="assertive"
      aria-label={title}
    >
      <section className="w-full max-w-sm rounded-card border-card bg-white p-6 text-center shadow-xl sm:p-8">
        <div className="relative mx-auto h-24 w-24">
          {isWorldCelebration ? (
            <>
              <div className="absolute inset-0 rounded-full bg-gold/35" />
              <span
                aria-hidden="true"
                className="absolute -top-2 -left-3 text-xl text-gold motion-safe:animate-pulse"
              >
                ✦
              </span>
              <span
                aria-hidden="true"
                className="absolute -right-3 bottom-2 text-lg text-pink motion-safe:animate-pulse"
              >
                ✦
              </span>
            </>
          ) : (
            <div className="absolute inset-1 rounded-full border-4 border-cream border-t-main-purple motion-safe:animate-spin" />
          )}
          <Image
            src={
              isWorldCelebration
                ? "/images/pop-icon/kutlayan-icon.png"
                : "/images/pop-icon/el-sallayan-icon.png"
            }
            alt=""
            width={96}
            height={96}
            unoptimized
            className={`relative h-24 w-24 object-contain ${
              isWorldCelebration
                ? "motion-safe:animate-pop-celebration"
                : ""
            }`}
          />
        </div>

        <h2 className="mt-5 font-heading text-xl font-semibold text-black">
          {title}
        </h2>
        <p className="mt-2 font-body text-sm leading-6 text-grey">
          {description}
        </p>

        <p className="mt-4 rounded-card bg-cream px-4 py-3 font-body text-sm font-semibold text-main-purple">
          Lütfen ekranı kapatmayın veya sayfayı yenilemeyin.
        </p>
      </section>
    </div>
  );
}
