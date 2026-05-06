"use client";

import packageJson from "../../package.json";
import { usePathname } from "next/navigation";

export function SiteFooter() {
  const pathname = usePathname();
  const hideOnDashboard = Boolean(pathname?.startsWith("/manage") || pathname?.startsWith("/t/"));

  if (hideOnDashboard) return null;

  return (
    <footer className="mt-auto border-t border-card-border py-4 text-center text-[11px] leading-relaxed text-muted transition-opacity duration-300">
      <p>v{packageJson.version}</p>
      <p className="mt-0.5">made by AaronKim</p>
    </footer>
  );
}
