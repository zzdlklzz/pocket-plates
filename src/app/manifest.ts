import type { MetadataRoute } from "next";
import { APP_METADATA } from "./app.constants";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_METADATA.name,
    short_name: APP_METADATA.shortName,
    description: APP_METADATA.description,
    start_url: APP_METADATA.startUrl,
    display: "standalone",
    background_color: APP_METADATA.backgroundColor,
    theme_color: APP_METADATA.themeColor,
    icons: [
      {
        src: APP_METADATA.iconPath,
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable"
      }
    ]
  };
}
