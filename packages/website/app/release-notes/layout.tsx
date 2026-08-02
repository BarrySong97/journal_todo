import type { Metadata } from "next";
import { OG_IMAGE } from "../site";

const title = "Release Notes";
const socialTitle = "Journal Todo Release Notes";
const description =
  "What's new in Journal Todo. Version history, new features, and fixes for the macOS and Windows desktop app.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/release-notes",
  },
  openGraph: {
    type: "website",
    url: "/release-notes",
    title: socialTitle,
    description,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: socialTitle,
    description,
    images: [OG_IMAGE.url],
  },
};

export default function ReleaseNotesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
