import { LogOut } from "lucide-react";
import { signOut } from "./auth.actions";
import { AuthSubmitButton } from "./auth-submit-button";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <AuthSubmitButton pendingLabel="Signing out..." variant="secondary">
        <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
        Sign out
      </AuthSubmitButton>
    </form>
  );
}
