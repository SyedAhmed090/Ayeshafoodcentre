// Install manifest for the rider phones only (also what the rider APK is built from); the customer site isn't an installable app.

export const dynamic = "force-static";

export function GET() {
  return Response.json(
    {
      id: "/rider",
      name: "Ayesha Rider",
      short_name: "Ayesha Rider",
      start_url: "/rider",
      scope: "/rider",
      display: "standalone",
      orientation: "portrait",
      background_color: "#F1F0EC",
      theme_color: "#C8281E",
      icons: [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        // The bike sits in the middle half, inside Android's safe zone, so the same picture works when cropped to a circle.
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } },
  );
}
