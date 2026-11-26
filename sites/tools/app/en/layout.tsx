import type { Metadata } from "next";
import { LocaleShell, localeMetadata } from "@/components/SiteRoutes";

export const metadata: Metadata = localeMetadata("en");

export default function EnglishLayout({ children }: { children: React.ReactNode }) {
  return <LocaleShell locale="en">{children}</LocaleShell>;
}
