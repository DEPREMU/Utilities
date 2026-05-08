import React, { useCallback, useMemo } from "react";
import Animated, {
  FadeInLeft,
  FadeOutLeft,
  LinearTransition,
} from "react-native-reanimated";
import { memoDeep } from "@utils";
import { useLanguage } from "@context/LanguageContext";
import { Button, FAB, Text } from "react-native-paper";
import { getFormatsButExclude } from "@common";
import { Images, useImagesStore } from "../services/zustand";
import { useStylesChangeImageFormat } from "../styles/useStylesChangeImageFormat";
import bytes from "bytes";

type RenderImageProps = {
  index: number;
  image: Images[number];
};

const RenderImage: React.FC<RenderImageProps> = ({ image, index }) => {
  const { t } = useLanguage();
  const { styles } = useStylesChangeImageFormat();

  const converting = useImagesStore((s) => s.converting);
  const changeImageFormat = useImagesStore((s) => s.changeImageFormat);

  const deleteImage = useImagesStore((s) => s.handleDeleteImage);

  const handleDeleteImage = useCallback(() => {
    deleteImage(image, "selected");
  }, [deleteImage, image]);

  const styleImage = useMemo(() => {
    return converting.includes(image.uri)
      ? styles.selectedImagePreviewConverting
      : styles.selectedImagePreview;
  }, [converting, image.uri, styles]);

  return (
    <Animated.View
      style={styles.selectedImageItem}
      layout={LinearTransition.duration(300).springify()}
      exiting={FadeOutLeft.duration(200).springify()}
      entering={FadeInLeft.delay(200 * index)
        .duration(200)
        .springify()}
    >
      <Animated.Text style={styles.subtitle}>{image.name}</Animated.Text>

      <Animated.View style={styles.divider} />

      <Animated.Text style={styles.h3}>
        {t("images.imageSize", {
          size: bytes(image.size, { unit: "MB" }) ?? String(image.size),
        })}
      </Animated.Text>

      <Animated.Text style={styles.h3}>
        {t("images.imageType", { type: image.type })}
      </Animated.Text>

      <Animated.Image source={{ uri: image.uri }} style={styleImage} />

      <Animated.View
        style={styles.sectionContainer}
        layout={LinearTransition.duration(200).springify()}
      >
        {getFormatsButExclude(image.type).map((format) => (
          <Button
            mode="contained"
            key={format}
            onPress={() => changeImageFormat(image, format)}
          >
            <Text style={styles.subtitle}>
              {t("images.canConvertToFormat", { format })}
            </Text>
          </Button>
        ))}
      </Animated.View>

      <FAB
        icon="delete"
        label={t("common.delete")}
        onPress={handleDeleteImage}
      />
    </Animated.View>
  );
};

export default memoDeep(RenderImage);
