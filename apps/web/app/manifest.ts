import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Orbit Social",
    short_name: "Orbit",
    description: "AI-assisted content, approvals, scheduling and social publishing.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f5f2",
    theme_color: "#111111",
    orientation: "any",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
