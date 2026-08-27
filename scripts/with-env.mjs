#!/usr/bin/env node
/**
 * Launcher that puts the repository-root `.env` in front of a command.
 *
 * Ports are configuration, so `WEB_PORT` / `ADMIN_PORT` live in `.env` like
 * everything else — but Next chooses its port before `next.config.ts` (and
 * therefore before any env loading inside the app) has run. This script closes
 * that gap: it loads the one root `.env`, maps the named port variable onto the
 * `PORT` variable Next reads, and execs the command from the calling package.
 *
 *   node scripts/with-env.mjs WEB_PORT next dev
 *   node ../scripts/with-env.mjs ADMIN_PORT next start
 */

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const [portVar, command, ...args] = process.argv.slice(2);
if (!portVar || !command) {
  console.error("usage: with-env.mjs <PORT_VAR> <command> [args...]");
  process.exit(64);
}

loadEnvConfig(REPO_ROOT, process.env.NODE_ENV !== "production");

const port = process.env[portVar]?.trim();
if (!port) {
  console.error(
    `Missing ${portVar} in ${path.join(REPO_ROOT, ".env")}. ` +
      `Copy .env.example to .env and fill it in.`,
  );
  process.exit(78);
}
process.env.PORT = port;

// Resolve the binary from the *calling* package so the admin uses its own copy.
const bin = path.join(process.cwd(), "node_modules", ".bin", command);

const child = spawn(bin, args, { stdio: "inherit", env: process.env });
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
