import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Orbit Social",
    short_name: "Orbit",
    description: "AI-assisted content, approvals, scheduling and social publishing.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafaf7",
    theme_color: "#fafaf7",
    orientation: "any",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
