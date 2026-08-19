import { spawnSync } from "node:child_process";
import { prepareLocalSupabase } from "./local-supabase.mjs";

let localSupabase;

try {
  localSupabase = prepareLocalSupabase();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : "Local Supabase setup failed."}\n`);
  process.exit(1);
}

process.stdout.write("Starting PocketPlates with the local database...\n");
const developmentServer = spawnSync("npx", ["next", "dev", ...process.argv.slice(2)], {
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: localSupabase.publishableKey,
    NEXT_PUBLIC_SUPABASE_URL: localSupabase.url
  },
  stdio: "inherit"
});

if (developmentServer.error) {
  process.stderr.write("The local development server could not start.\n");
  process.exit(1);
}

process.exit(developmentServer.status ?? (developmentServer.signal === "SIGINT" ? 0 : 1));
