import Image from "next/image";
import BodyText from "./BodyText";
import Button from "./button";
import SectionTitle from "./SectionTitle";

type ProfileStat = {
  label: string;
  value: string;
  icon: string;
};

type ProfileCardProps = {
  userName: string;
  email: string;
  avatar: string;
  role?: string;
  stats: ProfileStat[];
  onSignOut: () => void;
  onChangePassword: () => void;
};

export default function ProfileCard({
  userName,
  email,
  avatar,
  role,
  stats,
  onChangePassword,
  onSignOut,
}: ProfileCardProps) {
  return (
    <article className="app-card app-card-feature w-full overflow-hidden">
      <div className="grid gap-6 lg:grid-cols-[224px_minmax(0,1fr)] xl:grid-cols-[224px_minmax(0,1fr)_30rem]">
        <div className="mx-auto w-full max-w-48 sm:max-w-56 lg:mx-0">
          <div className="h-48 w-48 overflow-hidden rounded-card border-card bg-cream sm:h-56 sm:w-56">
            <Image
              src={avatar}
              alt={`${userName} avatarı`}
              width={224}
              height={224}
              className="h-full w-full object-contain"
            />
          </div>
        </div>

        <div className="min-w-0">
          <SectionTitle title={userName} />

          {role && (
            <BodyText
              as="p"
              size="base"
              tone="muted"
              weight="normal"
              className="mt-2"
            >
              {role}
            </BodyText>
          )}

          <div className="mt-10 grid gap-4 border-t border-beige pt-5 sm:grid-cols-2">
            <div>
              <BodyText as="p" size="xs" tone="muted" weight="bold">
                Kullanıcı Adı
              </BodyText>

              <BodyText
                as="p"
                size="base"
                tone="default"
                weight="semibold"
                className="mt-1"
              >
                {userName}
              </BodyText>
            </div>

            <div>
              <BodyText as="p" size="xs" tone="muted" weight="bold">
                E-posta
              </BodyText>

              <BodyText
                as="p"
                size="base"
                tone="default"
                weight="semibold"
                className="mt-1 break-all"
              >
                {email}
              </BodyText>
            </div>
            <div className="flex w-full flex-wrap justify-center gap-3 sm:col-span-2">
              <Button
                variant="secondary"
                onClick={onChangePassword}
                className="w-fit"
              >
                Şifreyi Değiştir
              </Button>

              <Button variant="secondary" onClick={onSignOut} className="w-fit">
                Çıkış Yap
              </Button>
            </div>
          </div>
        </div>

        <ul
          aria-label="Profil istatistikleri"
          className="grid grid-cols-2 content-start gap-3 lg:col-span-2 xl:col-span-1 xl:grid-cols-2"
        >
          {stats.map((stat) => (
            <li
              key={stat.label}
              className="flex min-h-24 items-center gap-3 rounded-card bg-cream p-3 sm:h-26 sm:gap-4 sm:p-4"
            >
              <Image
                src={stat.icon}
                alt=""
                width={40}
                height={40}
                aria-hidden="true"
                className="h-9 w-9 shrink-0 object-contain sm:h-10 sm:w-10"
              />

              <div>
                <BodyText as="p" size="sm" tone="muted" weight="normal">
                  {stat.label}
                </BodyText>

                <BodyText
                  as="p"
                  size="lg"
                  tone="default"
                  weight="bold"
                  className="mt-1"
                >
                  {stat.value}
                </BodyText>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
