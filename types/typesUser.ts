export type UserData = {
  name: string;
  email: string;
  phone: string | null;
  userId: string;
  password: string;
  description: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type UserSession = {
  access_token: string;
  refresh_token: string;
  user: Omit<UserData, "password">;
};
