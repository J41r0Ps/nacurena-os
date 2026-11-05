import type { NextConfig } from "next";

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
};

export default nextConfig;
