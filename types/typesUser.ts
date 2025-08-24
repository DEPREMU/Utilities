export type UserData = {
  uid: string;
  name: string;
  phone: string | null;
  description: string | null;
  createdAt?: string;
  updatedAt?: string;
  email: string;
};

export type UserSession = {
  access_token: string;
  refresh_token: string;
  user: UserData;
};
