import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // `next build` writes plain HTML to out/: no server needed at runtime.
  output: "export",
  // The image optimizer runs on a server, which a static export does not have.
  images: { unoptimized: true },
  // Routes become about/index.html, which static hosts serve without a redirect.
  trailingSlash: true,
  // Stops `next dev` creating AGENTS.md when it detects an AI agent.
  // This project's agent rules live in CLAUDE.md.
  agentRules: false,
  // Two root layouts leave no single layout for a 404, which is what this file is for (ADR-011).
  experimental: { globalNotFound: true },
};

// Points next-intl at src/i18n/request.ts. It adds no client code: only the server reads messages.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
