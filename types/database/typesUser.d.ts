export type UserSession = {
  access_token: string;
  refresh_token: string;
  user: Omit<UserData, "password">;
};
