import WorldCard from "../WorldCard";

const worlds = [
  {
    level: 1,
    name: "Orman",
    image: "/images/worlds/orman.png",
    type: "orman" as const,
    description: "Başlangıç Noktası",
  },
  {
    level: 2,
    name: "Köy",
    image: "/images/worlds/koy.png",
    type: "koy" as const,
    description: "Temelleri Güçlendir",
  },
  {
    level: 3,
    name: "Okyanus",
    image: "/images/worlds/okyanus.png",
    type: "okyanus" as const,
    description: "Bilgini Derinleştir",
  },
  {
    level: 4,
    name: "Volkan",
    image: "/images/worlds/volkan.png",
    type: "volkan" as const,
    description: "Zorlan ve Geliş",
  },
  {
    level: 5,
    name: "Krallık",
    image: "/images/worlds/krallik.png",
    type: "krallik" as const,
    description: "Ustalığını Göster",
  },
];

export default function WorldExplorer() {
  return (
    <section className="bg-white px-5 py-16 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-center font-heading text-3xl font-extrabold uppercase text-main-purple sm:text-4xl">
          Dünyaları Keşfet
        </h2>

        <p className="mx-auto mt-3 max-w-xl text-center font-body text-sm leading-relaxed text-grey">
          Mindpop Akademi’de her dünya, öğrenme yolculuğundaki bir seviyeyi
          temsil eder.
        </p>

        <div className="mt-10 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {worlds.map((world) => (
            <WorldCard
              key={world.type}
              level={world.level}
              name={world.name}
              image={world.image}
              type={world.type}
              description={world.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
