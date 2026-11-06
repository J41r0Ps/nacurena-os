import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DesktopIdentity } from "./DesktopIdentity";

const renderIdentity = () => render(<DesktopIdentity contactLabel="Contact" emailLabel="Email" />);

describe("DesktopIdentity", () => {
  it("has one h1 with Jairo's name", () => {
    renderIdentity();

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Jairo Nacurena");
  });

  // The expected hrefs are typed out on purpose. Importing them from the component
  // would compare a value with itself, and the test could never fail.
  it.each([
    ["GitHub", "https://github.com/J41r0Ps"],
    ["LinkedIn", "https://www.linkedin.com/in/jairo-nacurena/"],
    ["Email", "mailto:jaironacurenaturnhout01@gmail.com"],
  ])("links %s to the correct address", (name, href) => {
    renderIdentity();

    expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
  });
});
