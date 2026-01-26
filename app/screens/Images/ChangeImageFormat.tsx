import {
  albumsImages,
  getFormatsButExclude,
  wrapFunctionWithError,
} from "@common";
import {
  AlbumsImages,
  ReturnSelectImage,
  RequestChangeImageFormat,
  ResponseChangeImageFormat,
} from "@types";
import {
  tTyped,
  logger,
  REPLACERS,
  getRouteAPI,
  selectImage,
  checkLanguage,
  downloadBase64,
} from "@utils";
import axios from "axios";
import { t } from "i18next";
import Button from "@components/common/ButtonComponent";
import { Text } from "react-native-paper";
import { useModal } from "@context/ModalContext";
import { useLanguage } from "@context/LanguageContext";
import useStylesChangeImageFormat from "@styles/screens/Images/useStylesChangeImageFormat";
import { Image, ScrollView, View } from "react-native";
import { useCallback, useRef, useState } from "react";

const getDataChangeImageFormat = wrapFunctionWithError(
  async (body: RequestChangeImageFormat) => {
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

    const url = await getRouteAPI("/images/changeImageFormat");
    const response = await axios.post<ResponseChangeImageFormat>(url, body, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  },
  true,
  async (_, errorMessage) => {
    logger.error(errorMessage);
    return {
      success: false,
      error: t("images.errorWhileConvertingImageMessage"),
    } as ResponseChangeImageFormat;
  },
);

const ChangeImageFormat = () => {
  const { t } = useLanguage();
  const { styles } = useStylesChangeImageFormat();
  const { openSnackBarRef } = useModal();

  const [images, setImages] = useState<
    Exclude<ReturnSelectImage, { canceled: true }>
  >([]);
  const [imagesConverted, setImagesConverted] = useState<
    { uri: string; name: string }[]
  >([]);
  const [converting, setConverting] = useState<number[]>([]);

  const handleDownloadImageRef = useRef(
    async (
      image: (typeof imagesConverted)[number],
      albumName?: AlbumsImages,
    ) => {
      try {
        const extension = image.name.split(".").pop() || "png";

        downloadBase64({
          uri: image.uri,
          fileName: image.name,
          albumName,
          directory: "images",
          typeFile: `image/${extension as "png"}`,
        });

        logger.log("Image saved:", image.name);
        openSnackBarRef.current(tTyped("images.downloadImageSuccessMessage"));
      } catch (error) {
        logger.error("Failed to download image:", error);
      }
    },
  );

  const handleDeleteImageRef = useRef(
    (image: (typeof imagesConverted)[number]) => {
      setImagesConverted((prev) => prev.filter((img) => img.uri !== image.uri));
      logger.log("Deleted converted image:", image.name);
    },
  );

  const handlePressSelectImageRef = useRef(async () => {
    const selectedImages = await selectImage({ multiple: true, base64: true });
    if (!Array.isArray(selectedImages)) {
      logger.error("Image selection was canceled or failed.");
      return;
    }

    setImages(selectedImages);
    logger.log(
      "Selected images:",
      selectedImages.map((img) => img.name),
    );
  });

  const changeImageFormat = useCallback(
    async (image: (typeof images)[number], format: typeof image.type) => {
      logger.log("Changing format for image:", image.name, "to", format);
      setConverting((prev) => [...prev, images.indexOf(image)]);

      const data = await getDataChangeImageFormat({
        format,
        imageBufferInString: image.base64 || "",
        lang: await checkLanguage(),
      });
      setConverting((prev) => prev.filter((i) => i !== images.indexOf(image)));

      if (!data) {
        logger.error("Failed to change image format, data fetched:", data);
        return;
      }

      if (!data?.imageUri) {
        openSnackBarRef.current(t("images.errorWhileConvertingImageMessage"));
        return;
      }
      if (data?.newFormat === image.type) {
        openSnackBarRef.current(t("images.errorWhileConvertingImageMessage"));
        return;
      }

      setImagesConverted((prev) => [
        ...prev,
        {
          uri: data?.imageUri || "",
          name: image.name.replace(`.${image.type}`, `.${format}`),
        },
      ]);
    },
    [t, openSnackBarRef, images],
  );

  const renderImages = useCallback(() => {
    if (!Array.isArray(images)) return null;

    return images.map((image, index) => (
      <View key={index} style={styles.selectedImageItem}>
        <Text style={styles.selectedImageText}>{image.name}</Text>
        <Text style={styles.selectedImageText}>
          {t("images.imageSize", { size: String(image.size) })}
        </Text>
        <Text style={styles.selectedImageText}>
          {t("images.imageType", { type: image.type })}
        </Text>
        <Image
          source={{ uri: image.uri }}
          style={
            converting.includes(index)
              ? styles.selectedImagePreviewConverting
              : styles.selectedImagePreview
          }
        />
        {getFormatsButExclude(image.type).map((format) => (
          <Button
            key={format}
            handlePress={changeImageFormat}
            argsFuncHandlePress={[image, format]}
            label={t("images.canConvertToFormat", { format })}
          />
        ))}
      </View>
    ));
  }, [images, styles, t, changeImageFormat, converting]);

  const renderImagesConverted = useCallback(() => {
    if (!Array.isArray(imagesConverted)) return null;

    return imagesConverted.map((image, index) => (
      <View key={index} style={styles.selectedImageItem}>
        <Text style={styles.selectedImageText}>{image.name}</Text>
        <Image
          source={{
            uri: image.uri,
          }}
          style={styles.selectedImagePreview}
          onError={() => handleDeleteImageRef.current(image)}
        />
        {REPLACERS.isNative &&
          Object.values(albumsImages).map((album) => (
            <Button
              key={album}
              label={t("images.downloadImageAlbumButtonLabel", {
                albumName: album,
              })}
              handlePress={handleDownloadImageRef.current}
              argsFuncHandlePress={[image, album]}
            />
          ))}
        <Button
          label={t("images.downloadImageButtonLabel")}
          handlePress={handleDownloadImageRef.current}
          argsFuncHandlePress={[image]}
        />
        <Button
          label={t("images.deleteImageButtonLabel")}
          handlePress={handleDeleteImageRef.current}
          argsFuncHandlePress={[image]}
        />
      </View>
    ));
  }, [imagesConverted, styles, t]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        style={styles.scrollViewContainer}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t("images.changeImageFormatTitle")}</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.paragraph}>
            {t("images.changeImageFormatDescription")}
          </Text>
          <Button
            handlePress={handlePressSelectImageRef.current}
            label={t("images.selectImageButtonLabel")}
          />
        </View>
        <View style={styles.selectedImagesContainer}>{renderImages()}</View>
        <View style={styles.selectedImagesContainer}>
          {renderImagesConverted()}
        </View>
      </ScrollView>
    </View>
  );
};

export default ChangeImageFormat;
