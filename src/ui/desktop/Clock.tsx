import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useDesktopShell } from "./desktopContext";

const subscribe = (onChange: () => void): (() => void) => {
  const timer = setInterval(onChange, 1000);
  return () => clearInterval(timer);
};

/** A static export cannot know the visitor's time, so the HTML and the first render hold none. */
const noTimeOnTheServer = (): string => "";

export const Clock = () => {
  const { locale } = useDesktopShell();
  const format = useMemo(
    () => new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }),
    [locale],
  );
  // A string, so React sees no change until the minute really turns over.
  const currentTime = useCallback(() => format.format(new Date()), [format]);
  const time = useSyncExternalStore(subscribe, currentTime, noTimeOnTheServer);

  // The fixed width keeps the taskbar from shifting when the time appears after mount.
  return (
    <time className="w-16 shrink-0 text-center font-mono text-label text-muted tabular-nums">
      {time}
    </time>
  );
};
