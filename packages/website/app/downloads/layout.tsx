import type { Metadata } from "next";
import { OG_IMAGE } from "../site";

const title = "Download";
const socialTitle = "Download Journal Todo";
const description =
  "Download Journal Todo for macOS and Windows. A minimal journal and todo app where every entry is a journal and every journal is a task.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/downloads",
  },
  openGraph: {
    type: "website",
    url: "/downloads",
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

export default function DownloadsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
