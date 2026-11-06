import { Desktop } from "@/ui/desktop/Desktop";

const links = [
  { label: "GitHub", href: "https://github.com/J41r0Ps" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/jairo-nacurena/" },
  { label: "Email", href: "mailto:jaironacurenaturnhout01@gmail.com" },
];

// No "use client": this page has no state, effects or event handlers, so it stays a Server
// Component. Only <Desktop> runs in the browser. The block below is passed in as `children`, so it
// is plain HTML that works without JavaScript, even though a client component places it.
// It stays until the real apps carry this content (Slices 6 and 8).
export default function Home() {
  return (
    <main>
      <Desktop>
        <div className="absolute top-4 right-4 flex flex-col items-end gap-1 text-right">
          <h1 className="font-display text-title font-medium">Jairo Nacurena</h1>
          <nav aria-label="Contact">
            <ul className="flex gap-3 text-ui text-muted">
              {links.map(({ label, href }) => (
                <li key={href}>
                  <a
                    href={href}
                    className="focus-ring underline underline-offset-4 hover:text-text"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </Desktop>
    </main>
  );
}
