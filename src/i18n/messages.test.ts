import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import { apps } from "@/apps/registry";
import { LOCALES } from "@/os/routing/desktopAddress";
import { messages } from "./messages";
import { buildShellStrings } from "./shellStrings";

/** Every leaf as a dotted path, so two languages can be compared key by key. */
const keysOf = (value: object, prefix = ""): string[] =>
  Object.entries(value).flatMap(([key, child]) =>
    typeof child === "object" && child !== null
      ? keysOf(child, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );

const placeholdersOf = (text: string): string[] => text.match(/\{\w+\}/g) ?? [];

const leaf = (root: object, path: string): string =>
  path.split(".").reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], root) as string;

describe("messages", () => {
  // `satisfies` catches a missing key at build time. This also catches a leftover extra key.
  it.each(LOCALES)("%s has exactly the keys of English", (locale) => {
    expect(keysOf(messages[locale]).toSorted()).toEqual(keysOf(messages.en).toSorted());
  });

  it.each(LOCALES)("%s keeps the placeholders of English", (locale) => {
    for (const key of keysOf(messages.en)) {
      expect(placeholdersOf(leaf(messages[locale], key))).toEqual(
        placeholdersOf(leaf(messages.en, key)),
      );
    }
  });

  it.each(LOCALES)("%s has no empty string", (locale) => {
    for (const key of keysOf(messages[locale])) {
      expect(leaf(messages[locale], key).trim()).not.toBe("");
    }
  });

  it("uses no em dash, which DESIGN §8 rules out of UI text", () => {
    expect(JSON.stringify(messages)).not.toContain("—");
  });
});

describe("buildShellStrings", () => {
  it.each(LOCALES)("gives every app its strings in %s, with the title filled in", (locale) => {
    const t = createTranslator({ locale, messages: messages[locale] });

    const strings = buildShellStrings(t);

    for (const app of apps) {
      const { title, close } = strings.apps[app.id];
      expect(title).toBe(messages[locale].apps[app.messageKey].title);
      expect(close).toContain(title);
      expect(close).not.toContain("{");
    }
  });
});
