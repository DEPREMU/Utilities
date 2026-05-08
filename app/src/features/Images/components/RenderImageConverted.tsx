import Animated, {
  FadeInRight,
  FadeOutRight,
  LinearTransition,
} from "react-native-reanimated";
import { useLanguage } from "@context/LanguageContext";
import { Button, Text } from "react-native-paper";
import React, { useCallback } from "react";
import { useStylesChangeImageFormat } from "../styles/useStylesChangeImageFormat";
import { ImagesConverted, useImagesStore } from "../services/zustand";
import { albumsImages, memoDeep, REPLACERS } from "@utils";

type RenderImageConvertedProps = {
    index: number;
  image: ImagesConverted[number];
};

const RenderImageConverted: React.FC<RenderImageConvertedProps> = ({
  image,
  index,
}) => {
  const { t } = useLanguage();
  const { styles } = useStylesChangeImageFormat();

  const handleDeleteImage = useImagesStore((s) => s.handleDeleteImage);
  const handleDownloadImage = useImagesStore((s) => s.handleDownloadImage);

  const deleteImage = useCallback(() => {
    handleDeleteImage(image, "converted");
  }, [handleDeleteImage, image]);

  const downloadImage = useCallback(() => {
    handleDownloadImage(image);
  }, [handleDownloadImage, image]);

  return (
    <Animated.View
      style={styles.selectedImageItem}
      layout={LinearTransition.duration(300).springify()}
      exiting={FadeOutRight.duration(200).springify()}
      entering={FadeInRight.delay(200 * index)
        .duration(200)
        .springify()}
    >
      <Animated.Text style={styles.subtitle}>{image.name}</Animated.Text>

      <Animated.View style={styles.divider} />

      <Animated.Image
        source={{
          uri: image.uri,
        }}
        style={styles.selectedImagePreview}
        onError={() => handleDeleteImage(image, "converted")}
      />
      {REPLACERS.isNative &&
        Object.values(albumsImages).map((album) => (
          <Button
            key={album}
            mode="contained"
            onPress={() => handleDownloadImage(image, album)}
          >
            <Text style={styles.subtitle}>
              {t("images.downloadImageAlbumButtonLabel", {
                albumName: album,
              })}
            </Text>
          </Button>
        ))}

      <Button mode="contained" onPress={downloadImage}>
        <Text style={styles.subtitle}>
          {t("images.downloadImageButtonLabel")}
        </Text>
      </Button>

      <Button mode="outlined" onPress={deleteImage}>
        <Text style={styles.subtitle}>
          {t("images.deleteImageButtonLabel")}
        </Text>
      </Button>
    </Animated.View>
  );
};

export default memoDeep(RenderImageConverted);
