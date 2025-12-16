import { RequestChangeImageFormat } from "../API";

export type ReturnSelectImage =
  | {
      uri: string;
      name: string;
      size: number;
      type: RequestChangeImageFormat["format"];
      base64?: string;
    }[]
  | {
      canceled: true;
    };

export type AlbumsImages = "UtilitiesApp" | "Downloads";
