import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home page", () => {
  it("has one h1 with Jairo's name", () => {
    render(<Home />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Jairo Nacurena",
    );
  });

  // The expected hrefs are typed out on purpose. Importing them from the page
  // would compare a value with itself, and the test could never fail.
  it.each([
    ["GitHub", "https://github.com/J41r0Ps"],
    ["LinkedIn", "https://www.linkedin.com/in/jairo-nacurena/"],
    ["Email", "mailto:jaironacurenaturnhout01@gmail.com"],
  ])("links %s to the correct address", (name, href) => {
    render(<Home />);

    expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
  });
});
