import { createTranslator } from "next-intl";
import type { ShellStrings } from "@/ui/desktop/shellStrings";
import { messages } from "./messages";
import { buildShellStrings } from "./shellStrings";

/** For tests only: the real English strings, so a test reads what a visitor reads. */
export const englishStrings = (): ShellStrings =>
  buildShellStrings(createTranslator({ locale: "en", messages: messages.en }));
