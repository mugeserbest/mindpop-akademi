import Image from "next/image";

const features = [
  {
    title: "Pop AI Mentor",
    text: "7/24 yanında olan kişisel mentor.",
    color: "border-gold",
  },
  {
    title: "Kişisel Yol Haritası",
    text: "Hedeflerine göre özel plan oluşturur.",
    color: "border-main-purple",
  },
  {
    title: "Rozetler",
    text: "Rozetleri topla, kendini geliştir.",
    color: "border-light-green",
  },
  {
    title: "Quiz ve Testler",
    text: "Öğrendiklerini pekiştir ve seviyeni ölç.",
    color: "border-pink",
  },
  {
    title: "Günlük Görevler",
    text: "Küçük adımlarla büyük ilerleme kaydet.",
    color: "border-pink",
  },
  {
    title: "Yan Görevler",
    text: "Ekstra XP kazan ve ödüller kazan.",
    color: "border-main-purple",
  },
  {
    title: "İlerleme Ağacı",
    text: "Gelişimini gör ve sonraki adımını planla.",
    color: "border-light-green",
  },
  {
    title: "Motivasyon Desteği",
    text: "Pop her gün seni motive eder.",
    color: "border-gold",
  },
];

export default function LearningFeatures() {
  return (
    <section className="bg-white px-5 py-16 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-center font-heading text-3xl font-extrabold uppercase text-main-purple sm:text-4xl">
          Seni neler bekliyor?
        </h2>

        <div className="mt-10 grid items-center gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="mx-auto w-full max-w-56 sm:max-w-xs">
            <Image
              src="/images/pop-icon/gulumseyen-icon.png"
              alt="Mutlu Pop karakteri"
              width={420}
              height={420}
              unoptimized
              className="h-auto w-full object-contain"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className={`flex aspect-square flex-col items-center justify-center rounded-card border-2 ${feature.color} bg-white p-4 text-center shadow-card`}
              >
                <h3 className="font-heading text-base font-extrabold uppercase text-black">
                  {feature.title}
                </h3>

                <p className="mt-2 font-body text-xs leading-relaxed text-grey">
                  {feature.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
