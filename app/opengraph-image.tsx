import { ImageResponse } from "next/og";

export const alt = "Mindpop Akademi - Öğrenmeyi maceraya dönüştür";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#fbfaff",
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          padding: "72px 84px",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 520,
            height: 520,
            borderRadius: "50%",
            background: "#eee8ff",
            right: -115,
            top: -110,
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 330,
            height: 330,
            borderRadius: "50%",
            background: "#ffd65a",
            opacity: 0.62,
            right: 85,
            bottom: -180,
            display: "flex",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            zIndex: 1,
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "#ffb8df",
                border: "5px solid #7b61ff",
                display: "flex",
              }}
            />
            <div
              style={{
                marginLeft: 18,
                fontSize: 34,
                fontWeight: 700,
                color: "#7b61ff",
                display: "flex",
              }}
            >
              Mindpop Akademi
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 74,
                lineHeight: 1.06,
                fontWeight: 800,
                color: "#251f35",
                display: "flex",
              }}
            >
              Öğrenmeyi
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 74,
                lineHeight: 1.06,
                fontWeight: 800,
                color: "#ff6bcb",
                display: "flex",
              }}
            >
              maceraya dönüştür.
            </div>
          </div>

          <div
            style={{
              fontSize: 30,
              lineHeight: 1.35,
              color: "#6f687a",
              display: "flex",
            }}
          >
            Hedefini yaz. POP sana özel yol haritanı hazırlasın.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
