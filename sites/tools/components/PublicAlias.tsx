"use client";
import { useEffect } from "react";
import Link from "next/link";

/** A real exported HTML page with a usable link even when JS is unavailable. */
export function PublicAlias({ href, locale }: { href: string; locale: string }) {
  useEffect(() => { window.location.replace(`${process.env.NEXT_PUBLIC_BASE_PATH || ""}${href}`); }, [href]);
  return <main className="container"><h1>{locale === "zh" ? "这条资源已调整位置" : "This resource has moved"}</h1><p><Link href={href}>{locale === "zh" ? "前往新的资源地址" : "Open the updated resource"}</Link></p></main>;
}
