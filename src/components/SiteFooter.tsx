import packageJson from "../../package.json";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-card-border py-4 text-center text-[11px] leading-relaxed text-muted">
      <p>v{packageJson.version}</p>
      <p className="mt-0.5">made by AaronKim</p>
    </footer>
  );
}
