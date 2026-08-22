import type {
  OwnProfileDto,
  OwnProfileRow,
  UpdateOwnProfileInput
} from "./profile.types";

export const OWN_PROFILE_SELECT = "display_name,username";

export function mapOwnProfile(row: OwnProfileRow): OwnProfileDto {
  return {
    displayName: row.display_name,
    username: row.username
  };
}

export function mapProfileToFormValues(
  profile: OwnProfileDto
): UpdateOwnProfileInput {
  return {
    displayName: profile.displayName ?? "",
    username: profile.username ?? ""
  };
}
