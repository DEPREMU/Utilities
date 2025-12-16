import { AlbumsImages, RequestChangeImageFormat } from "@types";

export const formatsImages: Record<RequestChangeImageFormat["format"], string> =
  {
    png: "image/png",
    gif: "image/gif",
    jpeg: "image/jpeg",
    webp: "image/webp",
    avif: "image/avif",
  };

export const extensionsImages: Record<
  RequestChangeImageFormat["format"],
  string
> = {
  png: ".png",
  gif: ".gif",
  jpeg: ".jpeg",
  webp: ".webp",
  avif: ".avif",
};

export const albumsImages: Record<AlbumsImages, AlbumsImages> = {
  Downloads: "Downloads",
  UtilitiesApp: "UtilitiesApp",
};

export const supportedFormatsImages = Object.keys(
  formatsImages
) as RequestChangeImageFormat["format"][];

export const getFormatsButExclude = (
  excludeFormat: RequestChangeImageFormat["format"]
): RequestChangeImageFormat["format"][] => {
  return supportedFormatsImages.filter((format) => format !== excludeFormat);
};
