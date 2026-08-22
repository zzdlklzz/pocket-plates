export type OwnProfileDto = {
  displayName: string | null;
  username: string | null;
};

export type UpdateOwnProfileInput = {
  displayName: string;
  username: string;
};

export type OwnProfileRow = {
  display_name: string | null;
  username: string | null;
};
