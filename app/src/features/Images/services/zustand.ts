import {
  AlbumsImages,
  GetStatesZustand,
  ReturnSelectImage,
  RequestChangeImageFormat,
  ResponseChangeImageFormat,
} from "@types";
import {
  tTyped,
  REPLACERS,
  selectImage,
  downloadBase64,
  storageManagement,
} from "@utils";
import axios from "axios";
import { create } from "zustand";
import { modalRef } from "@/app/refs";
import { getValueState, ServerFetch, wrapFunctionWithError } from "@common";

export type Images = Exclude<ReturnSelectImage, { canceled: true }>;
export type ImagesConverted = {
  uri: string;
  name: string;
}[];

export type RenderType = "selected" | "converted";

type States = GetStatesZustand<{
  images: Images;
  converting: string[];
  renderType: RenderType;
  ImagesConverted: ImagesConverted;
}>;

type Actions = {
  handleDeleteImage: (
    image: ImagesConverted[number],
    type: "converted" | "selected",
  ) => void;
  handleDownloadImage: (
    image: ImagesConverted[number],
    album?: AlbumsImages,
  ) => void;
  changeImageFormat: (
    image: Images[number],
    format: Images[number]["type"],
  ) => Promise<void>;
  selectImages: () => Promise<void>;

  cleanup: () => void;
};

const getDataChangeImageFormat = async (
  body: RequestChangeImageFormat,
): Promise<ResponseChangeImageFormat> => {
  try {
    if (REPLACERS.isWeb) {
      const data = await wrapFunctionWithError(
        async () => {
          const res = await axios.post<ResponseChangeImageFormat>(
            "http://localhost:3005/change-image-format",
            body,
          );
          return res.data;
        },
        async () => null,
      );
      if (data) return data;
    }

    const res = await ServerFetch.post("/images/change-format", { body });

    return res.data;
  } catch (error) {
    REPLACERS.Logger.error("Error in getDataChangeImageFormat:", error);
    return {
      error: tTyped("images.errorWhileConvertingImageMessage"),
      success: false,
    };
  }
};

export const useImagesStore = create<States & Actions>()((set, get) => {
  const value: States & Actions = {
    images: [],
    setImages: (v) => set({ images: getValueState(v, () => get().images) }),

    renderType: "selected",
    setRenderType: (v) =>
      set({ renderType: getValueState(v, () => get().renderType) }),

    converting: [],
    setConverting: (v) =>
      set({ converting: getValueState(v, () => get().converting) }),

    ImagesConverted: [],
    setImagesConverted: (v) =>
      set({
        ImagesConverted: getValueState(v, () => get().ImagesConverted),
      }),

    handleDeleteImage: (image, type) => {
      if (type === "converted") {
        set({
          ImagesConverted: get().ImagesConverted.filter(
            (img) => img.uri !== image.uri,
          ),
        });
      } else {
        set({
          images: get().images.filter((img) => img.uri !== image.uri),
        });
      }
    },

    handleDownloadImage: async (image, albumName) => {
      try {
        const extension = image.name.split(".").pop() || "png";

        downloadBase64({
          albumName,
          uri: image.uri,
          fileName: image.name,
          typeFile: `image/${extension as "png"}`,
          directory: "images",
        });

        REPLACERS.Logger.log("Image saved:", image.name);
        modalRef.openSnackBar?.(tTyped("images.downloadImageSuccessMessage"));
      } catch (error) {
        REPLACERS.Logger.error("Failed to download image:", error);
      }
    },

    changeImageFormat: async (image, format) => {
      REPLACERS.Logger.log(
        "Changing format for image:",
        image.name,
        "to",
        format,
      );
      set((prev) => ({
        converting: [...prev.converting, image.uri],
      }));

      const data = await getDataChangeImageFormat({
        format,
        lang: storageManagement.get("LANGUAGE"),
        imageStr: image.base64 || "",
      });
      set((prev) => ({
        converting: prev.converting.filter((i) => i !== image.uri),
      }));

      if (!data) {
        REPLACERS.Logger.error(
          "Failed to change image format, data fetched:",
          data,
        );
        return;
      }

      if (!data?.imageUri) {
        modalRef.openSnackBar?.(
          tTyped("images.errorWhileConvertingImageMessage"),
        );
        return;
      }
      if (data?.newFormat === image.type) {
        modalRef.openSnackBar?.(
          tTyped("images.errorWhileConvertingImageMessage"),
        );
        return;
      }

      set((prev) => ({
        ImagesConverted: [
          ...prev.ImagesConverted,
          {
            uri: data?.imageUri || "",
            name: image.name.replace(`.${image.type}`, `.${format}`),
          },
        ],
      }));
    },

    selectImages: async () => {
      const selectedImages = await selectImage({
        multiple: true,
        base64: true,
      });
      if (!Array.isArray(selectedImages) || selectedImages.length === 0) {
        REPLACERS.Logger.error("Image selection was canceled or failed.");
        return;
      }

      set((prev) => ({
        images: [...prev.images, ...selectedImages],
      }));
    },

    cleanup: () => {
      set({
        images: [],
        converting: [],
        renderType: "selected",
        ImagesConverted: [],
      });
    },
  };

  return value;
});
