import type { Metadata } from "next";
import { LocaleShell, localeMetadata } from "@/components/SiteRoutes";

export const metadata: Metadata = localeMetadata("zh");

export default function ChineseLayout({ children }: { children: React.ReactNode }) {
  return <LocaleShell locale="zh">{children}</LocaleShell>;
}
