const steps = [
  "Hedefini yaz.",
  "Pop yol haritanı hazırlar.",
  "Görevleri tamamla.",
  "Rozetleri kazan.",
];

export default function JourneySteps() {
  return (
    <section className="bg-gold px-5 py-6 sm:px-8 sm:py-7">
      <ol className="mx-auto grid max-w-md gap-3 sm:max-w-6xl sm:grid-cols-4 sm:gap-6">
        {steps.map((step, index) => (
          <li
            key={step}
            className="flex min-h-14 items-center gap-3 rounded-card border border-white/80 bg-white/70 px-4 py-3 text-left font-body text-sm font-bold text-black shadow-sm sm:min-h-0 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:shadow-none"
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white font-heading text-sm text-main-purple">
              {index + 1}
            </span>
            <span className="leading-snug">{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
