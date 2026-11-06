import type { Locale } from "@/os/routing/desktopAddress";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import nl from "../../messages/nl.json";

export type Messages = typeof en;

/** `satisfies` fails the build if a language misses a key that English has. */
export const messages = { en, nl, es } satisfies Record<Locale, Messages>;
