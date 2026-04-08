import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AgriFlow",
    short_name: "AgriFlow",
    description:
      "AgriFlow is the intelligence layer for agricultural price gaps, farmer alerts, and FPO movement recommendations.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f5f7ef",
    theme_color: "#2f6b46",
    orientation: "portrait",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
