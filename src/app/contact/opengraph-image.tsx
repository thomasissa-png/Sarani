import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Sarani — Start a Project. Response Within 1 Hour.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#000000",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px",
        }}
      >
        <div
          style={{
            width: 60,
            height: 4,
            backgroundColor: "#da5126",
            marginBottom: 32,
            borderRadius: 2,
          }}
        />
        <div
          style={{
            color: "#da5126",
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: "0.2em",
            marginBottom: 24,
          }}
        >
          SARANI
        </div>
        <div
          style={{
            color: "#ffffff",
            fontSize: 52,
            fontWeight: 700,
            textAlign: "center",
            lineHeight: 1.2,
          }}
        >
          Start a Project
        </div>
        <div
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: 28,
            marginTop: 24,
            textAlign: "center",
          }}
        >
          Response within 1 hour
        </div>
      </div>
    ),
    { ...size },
  );
}
