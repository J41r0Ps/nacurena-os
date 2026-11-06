interface DesktopIdentityProps {
  readonly contactLabel: string;
  readonly emailLabel: string;
}

/**
 * The no-JavaScript guarantee: the name and contact links are plain HTML on every route. It stays
 * until the real apps carry this content (Slices 6 and 8).
 */
export const DesktopIdentity = ({ contactLabel, emailLabel }: DesktopIdentityProps) => {
  const links = [
    { label: "GitHub", href: "https://github.com/J41r0Ps" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/jairo-nacurena/" },
    { label: emailLabel, href: "mailto:jaironacurenaturnhout01@gmail.com" },
  ];

  return (
    <div className="absolute top-4 right-4 flex flex-col items-end gap-1 text-right">
      <h1 className="font-display text-title font-medium">Jairo Nacurena</h1>
      <nav aria-label={contactLabel}>
        <ul className="flex gap-3 text-ui text-muted">
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
  );
};
