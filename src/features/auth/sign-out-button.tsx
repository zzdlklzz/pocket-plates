import { LogOut } from "lucide-react";
import { signOut } from "./auth.actions";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        className="inline-flex items-center gap-1 rounded-lg border border-leaf-100 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
        type="submit"
      >
        <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
        Sign out
      </button>
    </form>
  );
}
