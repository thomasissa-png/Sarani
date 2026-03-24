import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://sarani.studio";
  const lastModified = new Date();

  return [
    { url: baseUrl, lastModified, changeFrequency: "weekly", priority: 1.0 },
    { url: `${baseUrl}/work`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/pricing`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/about`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/contact`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/legal`, lastModified, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/case-studies/tiktok-video-production`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/case-studies/sony-banner-production`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/case-studies/geodis-presentation-rebranding`, lastModified, changeFrequency: "monthly", priority: 0.8 },
  ];
}
