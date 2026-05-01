import {
  DragEndParams,
  SortableGridRenderItem,
} from "react-native-sortables/dist/typescript/types";
import {
  View,
  Image,
  Pressable,
  ScrollView,
  GestureResponderEvent,
} from "react-native";
import {
  logger,
  PDFDoc,
  memoDeep,
  createPdfFromImages,
  REPLACERS,
  elapsedTime,
} from "@utils";
import {
  Menu,
  Text,
  Button,
  Divider,
  TextInput,
  ProgressBar,
  ActivityIndicator,
} from "react-native-paper";
import Sortable from "react-native-sortables";
import { shareAsync } from "expo-sharing";
import { useLanguage } from "@/context/LanguageContext";
import { useStylesPDF } from "@/features/PDF/styles/useStylesPDF";
import { cloneDeep, isNaN } from "lodash";
import * as DirectoryPicker from "expo-document-picker";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useAnimatedRef } from "react-native-reanimated";
import React, { useRef, useState, useCallback, useMemo } from "react";

type PaperSizes = keyof typeof PDFDoc.PageSizes | "CUSTOM" | "GET_FROM_IMAGE";

type PickedImage = {
  uri: string;
  name: string;
};

const PAPER_SIZES: PaperSizes[] = [
  ...(Object.keys(PDFDoc.PageSizes) as PaperSizes[]),
  "CUSTOM",
  "GET_FROM_IMAGE",
];

const ACTIONS_MENU = [
  {
    key: "delete",
    label: "common.delete",
  },
] as const;

const defaultActionsMenu = {
  image: {} as PickedImage,
  anchor: { x: 0, y: 0 },
  visible: false,
  actionKey: "",
};

const PDFConverter: React.FC = () => {
  const { t } = useLanguage();
  const { styles } = useStylesPDF();

  const [sizePdf, setSizePdf] = useState<PaperSizes>("GET_FROM_IMAGE");
  const [progress, setProgress] = useState<number>(0);
  const [maxSizePdf, setMaxSizePdf] = useState<number>(-1);
  const [customSize, setCustomSize] = useState({ width: 612, height: 792 });

  const [anchor, setAnchor] = useState({ x: 0, y: 0 });
  const [images, setImages] = useState<PickedImage[]>([]);
  const [filename, setFilename] = useState<string>(`PDF-${Date.now()}`);
  const [converting, setConverting] = useState<boolean>(false);
  const [actionsMenu, setActionsMenu] =
    useState<typeof defaultActionsMenu>(defaultActionsMenu);
  const [isSelectingSize, setIsSelectingSize] = useState<boolean>(false);

  const scrollableRef = useAnimatedRef<Animated.ScrollView>();

  const paperSizesRendered = useMemo(
    () =>
      PAPER_SIZES.map((size) => {
        let title: string = size;
        if (size === "CUSTOM") title = t("PDF.customSize");
        else if (size === "GET_FROM_IMAGE")
          title = t("PDF.getSizeFromImageFiles");

        return (
          <Menu.Item
            key={size}
            title={title}
            onPress={() => {
              setSizePdf(size);
              setIsSelectingSize(false);
            }}
          />
        );
      }),
    [t],
  );

  const handleChangeOrderRef = useRef((params: DragEndParams) => {
    const to = params.toIndex;
    const from = params.fromIndex;

    setImages((prev) => {
      const newImages = cloneDeep(prev);
      const movedItem = newImages.splice(from, 1)[0];
      newImages.splice(to, 0, movedItem);

      return newImages;
    });
  });

  const onPressSelectSizeRef = useRef((event: GestureResponderEvent) => {
    setIsSelectingSize((prev) => !prev);
    const { pageX, pageY } = event.nativeEvent;
    setAnchor({ x: pageX, y: pageY });
  });

  const handlePressSelectImagesRef = useRef(async () => {
    const images = await DirectoryPicker.getDocumentAsync({
      type: "image/*",
      multiple: true,
    });

    if (images.canceled) return;

    setImages((prev) => [
      ...prev,
      ...images.assets.map((img) => ({ uri: img.uri, name: img.name })),
    ]);
  });

  const deleteItemRef = useRef((item?: PickedImage) => {
    if (!item) setImages([]);
    else setImages((prev) => prev.filter((image) => image.uri !== item.uri));
  });

  const handleChangeMaxSizeRef = useRef((text: string) => {
    setMaxSizePdf((prev) => {
      const size = Number(text);
      if (isNaN(size)) return text.slice(0, -1).length === 0 ? -1 : prev;
      else return size;
    });
  });

  const handlePressConvertToPdf = useCallback(async () => {
    try {
      if (!images.length) return;
      setConverting(true);
      const result = await createPdfFromImages(
        images,
        {
          sizePdf,
          customSize,
          maxSizePdf,
          filename,
        },
        (value) => setProgress(value),
      );

      if (!result) return;

      if (REPLACERS.isWeb) {
        const link = document.createElement("a");
        link.href = result.uri;
        link.download = result.fileName;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          result.cleanup();
        }, 60 * 1000);
      } else {
        await shareAsync(result.uri, { mimeType: "application/pdf" });
        await result.cleanup();
      }
    } catch (error) {
      logger.error("PDF", "error converting to PDF", (error as Error).message);
    } finally {
      setProgress(0);
      setConverting(false);
    }
  }, [sizePdf, filename, images, maxSizePdf, customSize]);

  const renderItem = useCallback<SortableGridRenderItem<PickedImage>>(
    ({ item }) => {
      const handleError = () => {
        setImages((prev) => prev.filter((image) => image.uri !== item.uri));
      };

      let presses = 0;
      let time = Date.now();

      return (
        <Pressable
          style={styles.image}
          onPress={(event) => {
            const { hasElapsed } = elapsedTime(time, 300);
            if (!hasElapsed) presses += 1;
            else presses = 1;
            time = Date.now();
            if (presses === 2) {
              presses = 0;
              const { pageX, pageY } = event.nativeEvent;
              setActionsMenu({
                image: item,
                anchor: {
                  x: pageX,
                  y: pageY,
                },
                visible: true,
                actionKey: "delete",
              });
            }
          }}
        >
          <Image
            source={{ uri: item.uri }}
            style={styles.image}
            resizeMode="cover"
            onError={handleError}
          />
          <Text numberOfLines={2}>{item.name}</Text>
        </Pressable>
      );
    },
    [styles],
  );

  return (
    <View style={styles.container}>
      {isSelectingSize && (
        <Menu
          visible
          anchor={anchor}
          onDismiss={() => setIsSelectingSize(false)}
        >
          <ScrollView style={styles.scrollView}>
            {paperSizesRendered}
          </ScrollView>
        </Menu>
      )}
      {actionsMenu.visible && (
        <Menu
          visible
          anchor={actionsMenu.anchor}
          onDismiss={() =>
            setActionsMenu((prev) => ({ ...prev, visible: false }))
          }
        >
          {ACTIONS_MENU.map((action) => (
            <Menu.Item
              key={action.key}
              title={t(action.label)}
              onPress={() => {
                if (action.key === "delete") {
                  setImages((prev) =>
                    prev.filter((image) => image.uri !== actionsMenu.image.uri),
                  );
                }

                setActionsMenu((prev) => ({ ...prev, visible: false }));
              }}
            />
          ))}
        </Menu>
      )}

      <Button
        mode="outlined"
        onPress={onPressSelectSizeRef.current}
        style={styles.menuAnchor}
      >
        {t(`PDF.selectCurrentPaperSize`, {
          size:
            sizePdf === "CUSTOM"
              ? t("PDF.customSize")
              : sizePdf === "GET_FROM_IMAGE"
                ? t("PDF.getSizeFromImageFiles")
                : sizePdf,
        })}
      </Button>

      {sizePdf === "CUSTOM" && (
        <>
          <TextInput
            value={String(customSize.width)}
            style={styles.textInput}
            label={t("PDF.customWidth", { width: String(customSize.width) })}
            onChangeText={(text) =>
              !isNaN(Number(text)) &&
              setCustomSize((prev) => ({ ...prev, width: Number(text) }))
            }
            keyboardType="numeric"
          />
          <TextInput
            value={String(customSize.height)}
            style={styles.textInput}
            label={t("PDF.customHeight", { height: String(customSize.height) })}
            onChangeText={(text) =>
              !isNaN(Number(text)) &&
              setCustomSize((prev) => ({ ...prev, height: Number(text) }))
            }
            keyboardType="numeric"
          />
        </>
      )}

      <Divider style={styles.divider} />

      <TextInput
        value={filename}
        style={styles.textInput}
        label={t("common.fileName", { name: filename })}
        onChangeText={setFilename}
      />

      <TextInput
        value={maxSizePdf === -1 ? "" : String(maxSizePdf)}
        style={styles.textInput}
        label={t("PDF.maxPdfSizeInMB", {
          size: maxSizePdf === -1 ? t("common.unlimited") : String(maxSizePdf),
        })}
        onChangeText={handleChangeMaxSizeRef.current}
        keyboardType="numeric"
      />

      <Button mode="contained" onPress={handlePressSelectImagesRef.current}>
        {t("PDF.selectImagesToConvert")}
      </Button>

      {converting && <ProgressBar style={styles.divider} progress={progress} />}

      <Divider style={styles.divider} />

      <GestureHandlerRootView>
        <Animated.ScrollView
          ref={scrollableRef}
          contentContainerStyle={styles.listContainer}
          style={styles.list}
        >
          <Sortable.Grid
            autoScrollEnabled
            data={images}
            rowGap={50}
            columns={3}
            columnGap={10}
            renderItem={renderItem}
            keyExtractor={(item) => item.uri}
            scrollableRef={scrollableRef}
            onActiveItemDropped={handleChangeOrderRef.current}
          />
        </Animated.ScrollView>
      </GestureHandlerRootView>

      <View style={styles.buttonsContainer}>
        <Button
          mode="outlined"
          onPress={() => deleteItemRef.current()}
          style={styles.button}
          disabled={!images.length || converting}
        >
          {t("common.deleteAll")}
        </Button>

        <Button
          mode="contained"
          style={styles.button}
          onPress={handlePressConvertToPdf}
          disabled={!images.length || converting}
        >
          {!converting ? (
            t("PDF.convertToPdf")
          ) : (
            <ActivityIndicator size="small" color="white" animating />
          )}
        </Button>
      </View>
    </View>
  );
};

export default memoDeep(PDFConverter);
