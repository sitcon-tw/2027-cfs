import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

// This command is used only by the dedicated Cloudflare preview Worker.
const env = {
	...process.env,
	BASE_PATH: "/",
	SITE_URL: process.env.SITE_URL || "https://2027-cfs-preview.sitcon.workers.dev"
};

execFileSync("pnpm", ["fetch-data"], { stdio: "inherit", env });
execFileSync("pnpm", ["build"], { stdio: "inherit", env });
writeFileSync("dist/_headers", "/*\n  X-Robots-Tag: noindex, nofollow\n");
