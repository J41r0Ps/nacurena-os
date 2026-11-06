import { WarningCircle } from "@phosphor-icons/react/dist/ssr/WarningCircle";

interface NotFoundLink {
  readonly label: string;
  readonly href: string;
}

interface NotFoundWindowProps {
  readonly windowTitle: string;
  readonly title: string;
  readonly body: string;
  readonly primary: NotFoundLink;
  readonly linksLabel: string;
  readonly links: readonly NotFoundLink[];
}

/**
 * A 404 that looks like the OS: one focused window on the desktop. It is a Server Component with
 * plain links, so it needs no store and keeps working if JavaScript fails. There is no error hue
 * in the palette, so an icon and text carry the message (DESIGN §5).
 */
export const NotFoundWindow = ({
  windowTitle,
  title,
  body,
  primary,
  linksLabel,
  links,
}: NotFoundWindowProps) => (
  <main className="flex h-dvh items-center justify-center bg-surface-sunken p-4">
    <section
      aria-labelledby="not-found-title"
      className="w-full max-w-120 rounded-window border border-border-strong shadow-focused"
    >
      <div className="flex h-(--titlebar-h) items-center gap-2 rounded-t-window bg-surface-raised px-2 text-ui font-medium text-text">
        <WarningCircle size={16} aria-hidden="true" className="shrink-0" />
        <p className="truncate">{windowTitle}</p>
      </div>
      <div className="flex flex-col items-start gap-4 rounded-b-window bg-surface p-6">
        <h1 id="not-found-title" className="font-display text-title font-medium">
          {title}
        </h1>
        <p className="text-body text-muted">{body}</p>
        <a
          href={primary.href}
          className="control-feedback focus-ring rounded-control bg-accent px-3 py-2 text-ui font-medium text-on-accent"
        >
          {primary.label}
        </a>
        <nav aria-label={linksLabel}>
          <ul className="flex flex-wrap gap-3 text-ui text-muted">
            {links.map(({ label, href }) => (
              <li key={href}>
                <a href={href} className="focus-ring underline underline-offset-4 hover:text-text">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  </main>
);
