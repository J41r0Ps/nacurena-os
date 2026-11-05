const links = [
  { label: "GitHub", href: "https://github.com/J41r0Ps" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/jairo-nacurena/" },
  { label: "Email", href: "mailto:jaironacurenaturnhout01@gmail.com" },
];

// No "use client": this page has no state, effects or event handlers, so it
// stays a Server Component and becomes plain HTML at build time.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <h1 className="font-display text-5xl font-bold tracking-tight sm:text-7xl">
        Jairo Nacurena
      </h1>
      <p className="font-mono text-accent">NacurenaOS — coming soon</p>
      <nav aria-label="Contact">
        <ul className="flex flex-wrap gap-6">
          {links.map(({ label, href }) => (
            <li key={href}>
              <a
                href={href}
                className="underline underline-offset-4 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
