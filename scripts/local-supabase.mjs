import { spawnSync } from "node:child_process";

function runSupabase(args) {
  return spawnSync("npx", ["supabase", ...args], {
    encoding: "utf8",
    stdio: ["inherit", "pipe", "pipe"]
  });
}

function readLocalStatus() {
  const statusResult = runSupabase(["status", "--output", "json"]);

  if (statusResult.status !== 0) {
    return null;
  }

  try {
    return JSON.parse(statusResult.stdout);
  } catch {
    return null;
  }
}

export function prepareLocalSupabase() {
  let localSupabase = readLocalStatus();

  if (!localSupabase) {
    process.stdout.write("Starting local Supabase...\n");
    const startResult = runSupabase(["start"]);

    if (startResult.status !== 0) {
      throw new Error("Local Supabase could not start. Confirm Docker is running, then try again.");
    }

    localSupabase = readLocalStatus();
  }

  if (!localSupabase?.API_URL || !localSupabase.PUBLISHABLE_KEY) {
    throw new Error("Local Supabase did not provide the public browser connection details.");
  }

  process.stdout.write("Applying pending local migrations...\n");
  const migrationResult = runSupabase(["migration", "up", "--local"]);

  if (migrationResult.status !== 0) {
    throw new Error(
      "Pending local migrations could not be applied. Run `npx supabase migration list --local` to inspect the local history."
    );
  }

  return {
    publishableKey: localSupabase.PUBLISHABLE_KEY,
    url: localSupabase.API_URL
  };
}
