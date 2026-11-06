import { describe, expect, it } from "vitest";
import { Size, Viewport, WindowManager, createAppId, createWindowId, type AppId } from "@/os/domain";
import {
  LOCALES,
  addressOf,
  isLocale,
  nextHistoryAction,
  parsePath,
  pathOf,
  type DesktopAddress,
} from "./desktopAddress";

const appId = (value: string): AppId => {
  const id = createAppId(value);
  if (!id.ok) throw new Error("bad app id");
  return id.value;
};

const projects = appId("projects");
const documents = appId("documents");
const appIds = [projects, documents];

const manager = (): WindowManager => {
  const viewport = Viewport.create(1280, 720);
  if (!viewport.ok) throw new Error("bad viewport");
  return WindowManager.create(viewport.value);
};

const open = (from: WindowManager, id: AppId, windowName: string): WindowManager => {
  const size = Size.create(640, 480);
  const name = createWindowId(windowName);
  if (!size.ok || !name.ok) throw new Error("bad fixture");
  const result = from.openApp(
    { id, singleInstance: false, defaultSize: size.value },
    () => name.value,
  );
  if (!result.ok) throw new Error("open failed");
  return result.value.manager;
};

describe("pathOf and parsePath", () => {
  // The expected paths are typed out on purpose: these exact URLs are printed and shared.
  it.each([
    [{ locale: "en", appId: null }, "/en/"],
    [{ locale: "nl", appId: null }, "/nl/"],
    [{ locale: "es", appId: null }, "/es/"],
    [{ locale: "en", appId: projects }, "/en/projects/"],
    [{ locale: "nl", appId: documents }, "/nl/documents/"],
  ] as [DesktopAddress, string][])("writes %j as %s", (address, path) => {
    expect(pathOf(address)).toBe(path);
  });

  it("reads back every address it writes, for every locale and app", () => {
    for (const locale of LOCALES) {
      for (const id of [null, ...appIds]) {
        const address = { locale, appId: id };
        expect(parsePath(pathOf(address), appIds)).toEqual(address);
      }
    }
  });

  it("reads a path without the trailing slash", () => {
    expect(parsePath("/en/projects", appIds)).toEqual({ locale: "en", appId: projects });
    expect(parsePath("/nl", appIds)).toEqual({ locale: "nl", appId: null });
  });

  it("reads the bare root as the English desktop", () => {
    expect(parsePath("/", appIds)).toEqual({ locale: "en", appId: null });
  });

  it.each(["/de/", "/en/unknown/", "/projects/", "/en/projects/extra/"])(
    "does not treat %s as an address",
    (path) => {
      expect(parsePath(path, appIds)).toBeNull();
    },
  );

  it("knows the three locales and nothing else", () => {
    expect(LOCALES.every(isLocale)).toBe(true);
    expect(isLocale("de")).toBe(false);
  });
});

describe("addressOf", () => {
  it("names no app when nothing has focus", () => {
    expect(addressOf(manager(), "nl")).toEqual({ locale: "nl", appId: null });
  });

  it("names the app of the focused window", () => {
    expect(addressOf(open(manager(), projects, "a"), "es")).toEqual({
      locale: "es",
      appId: projects,
    });
  });

  it("follows focus to the app behind when the focused window closes", () => {
    const both = open(open(manager(), projects, "a"), documents, "b");
    const name = createWindowId("b");
    if (!name.ok) throw new Error("bad fixture");
    const closed = both.closeWindow(name.value);
    if (!closed.ok) throw new Error("close failed");

    expect(addressOf(closed.value.manager, "en").appId).toBe(projects);
  });
});

describe("nextHistoryAction", () => {
  const root: DesktopAddress = { locale: "en", appId: null };
  const inProjects: DesktopAddress = { locale: "en", appId: projects };
  const inDocuments: DesktopAddress = { locale: "en", appId: documents };

  it("pushes a deliberate open, so Back returns to where the visitor was", () => {
    expect(nextHistoryAction(root, inProjects, "open")).toBe("push");
    expect(nextHistoryAction(inProjects, inDocuments, "open")).toBe("push");
  });

  it("replaces when focus only moved, so clicks never fill the history", () => {
    expect(nextHistoryAction(inProjects, inDocuments, "follow")).toBe("replace");
  });

  it("replaces when the last window goes, so Back cannot bring a closed app back", () => {
    expect(nextHistoryAction(inProjects, root, "follow")).toBe("replace");
  });

  it("does nothing when the address did not change", () => {
    expect(nextHistoryAction(inDocuments, inDocuments, "open")).toBe("none");
    expect(nextHistoryAction(inDocuments, inDocuments, "follow")).toBe("none");
  });

  it("repairs a path it cannot read instead of adding to the history", () => {
    expect(nextHistoryAction(null, inProjects, "follow")).toBe("replace");
  });
});
