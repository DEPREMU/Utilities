import {
  Images,
  RenderType,
  useImagesStore,
  ImagesConverted,
} from "../services/zustand";
import Animated, {
  FadeInLeft,
  FadeInRight,
  FadeOutLeft,
  FadeOutRight,
  LinearTransition,
} from "react-native-reanimated";
import Button from "@components/Button/screens";
import { View } from "react-native";
import RenderImage from "../components/RenderImage";
import { useLanguage } from "@context/LanguageContext";
import RenderImageConverted from "../components/RenderImageConverted";
import { useCallback, useMemo } from "react";
import {  AppTranslationsKeys } from "@types";
import { SegmentedButtons, Text } from "react-native-paper";
import { useStylesChangeImageFormat } from "@screens/Images/styles/useStylesChangeImageFormat";

type Button = {
  value: RenderType;
  label: AppTranslationsKeys;
};

const BUTTONS: Button[] = [
  {
    label: "images.selectedImagesTabTitle",
    value: "selected",
  },
  {
    label: "images.convertedImagesTabTitle",
    value: "converted",
  },
];

const ChangeImageFormat = () => {
  const { styles } = useStylesChangeImageFormat();
  const { t, dynamicT } = useLanguage();

  const images = useImagesStore((s) => s.images);
  const renderType = useImagesStore((s) => s.renderType);
  const selectImages = useImagesStore((s) => s.selectImages);
  const setRenderType = useImagesStore((s) => s.setRenderType);
  const imagesConverted = useImagesStore((s) => s.ImagesConverted);

  const renderImage = useCallback(
    ({ item: image, index }: { item: Images[number]; index: number }) => {
      return <RenderImage image={image} index={index} />;
    },
    [],
  );

  const renderImageConverted = useCallback(
    ({
      item: image,
      index,
    }: {
      item: ImagesConverted[number];
      index: number;
    }) => {
      return <RenderImageConverted image={image} index={index} />;
    },
    [],
  );

  const renderEmptyImagesSelected = useCallback(() => {
    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.paragraph}>{t("common.empty")}</Text>
      </View>
    );
  }, [t, styles.sectionContainer, styles.paragraph]);

  const renderEmptyImagesConverted = useCallback(() => {
    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.paragraph}>{t("common.empty")}</Text>
      </View>
    );
  }, [t, styles.sectionContainer, styles.paragraph]);

  const buttons = useMemo(() => {
    return BUTTONS.map((button) => ({
      ...button,
      label: dynamicT(button.label),
    }));
  }, [dynamicT]);

  return (
    <Animated.View
      style={styles.container}
      layout={LinearTransition.duration(300).springify()}
    >
      <Animated.View
        style={styles.header}
        layout={LinearTransition.duration(200).springify()}
      >
        <Animated.Text style={styles.title}>
          {t("images.changeImageFormatTitle")}
        </Animated.Text>
      </Animated.View>

      <SegmentedButtons
        value={renderType}
        buttons={buttons}
        onValueChange={setRenderType}
      />

      {renderType === "selected" && (
        <Animated.View
          style={styles.scrollViewContainer}
          layout={LinearTransition.duration(200).springify()}
          exiting={FadeOutLeft.duration(200).springify()}
          entering={FadeInLeft.duration(200).springify()}
        >
          <Animated.View
            style={styles.content}
            layout={LinearTransition.duration(200).springify()}
          >
            <Animated.Text style={styles.paragraph}>
              {t("images.changeImageFormatDescription")}
            </Animated.Text>

            <Button
              label={t("images.selectImageButtonLabel")}
              handlePress={selectImages}
            />
          </Animated.View>

          <Animated.FlatList
            data={images}
            style={styles.scrollViewContainer}
            layout={LinearTransition.duration(200).springify()}
            renderItem={renderImage}
            ListEmptyComponent={renderEmptyImagesSelected}
            contentContainerStyle={styles.scrollViewContentContainer}
          />
        </Animated.View>
      )}

      {renderType === "converted" && (
        <Animated.View
          style={styles.scrollViewContainer}
          layout={LinearTransition.duration(200).springify()}
          exiting={FadeOutRight.duration(200).springify()}
          entering={FadeInRight.duration(200).springify()}
        >
          <Animated.FlatList
            data={imagesConverted}
            style={styles.scrollViewContainer}
            layout={LinearTransition.duration(200).springify()}
            renderItem={renderImageConverted}
            ListEmptyComponent={renderEmptyImagesConverted}
            contentContainerStyle={styles.scrollViewContentContainer}
          />
        </Animated.View>
      )}
    </Animated.View>
  );
};

export default ChangeImageFormat;
