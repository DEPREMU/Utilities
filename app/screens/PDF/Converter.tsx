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
  memoDeep,
  REPLACERS,
  URI_EXTENSION,
  deleteDirectoryPickerFolder,
} from "@utils";
import Sortable from "react-native-sortables";
import { cloneDeep } from "lodash";
import { createPdf } from "react-native-pdf-from-image";
import { shareAsync } from "expo-sharing";
import { useLanguage } from "@context/LanguageContext";
import { useStylesPDF } from "@styles/screens/PDF/useStylesPDF";
import * as ExpoFileSystem from "expo-file-system";
import * as DirectoryPicker from "expo-document-picker";
import { Button, Divider, Menu, Text, TextInput } from "react-native-paper";

import React, { useCallback, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useAnimatedRef } from "react-native-reanimated";

type PaperSizes = Exclude<
  Parameters<typeof createPdf>[0]["paperSize"],
  undefined
>;

type PickedImage = {
  uri: string;
  name: string;
};

const PAPER_SIZES: PaperSizes[] = [
  ...Array.from({ length: 10 }, (_, i) => `A${i}` as PaperSizes),
  ...Array.from({ length: 5 }, (_, i) => `B${i}` as PaperSizes),
  ...Array.from({ length: 10 }, (_, i) => `C${i}` as PaperSizes),
  "Letter",
  "Legal",
  "Tabloid",
  "Ledger",
  "Executive",
  "Folio",
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

  const [sizePdf, setSizePdf] = useState<PaperSizes>("A4");

  const [anchor, setAnchor] = useState({ x: 0, y: 0 });
  const [images, setImages] = useState<PickedImage[]>([]);
  const [filename, setFilename] = useState(`PDF-${Date.now()}`);
  const [actionsMenu, setActionsMenu] = useState(defaultActionsMenu);
  const [isSelectingSize, setIsSelectingSize] = useState(false);

  const scrollableRef = useAnimatedRef<Animated.ScrollView>();

  const paperSizesRenderedRef = useRef(
    PAPER_SIZES.map((size) => (
      <Menu.Item
        key={size}
        title={size}
        onPress={() => {
          setSizePdf(size);
          setIsSelectingSize(false);
        }}
      />
    )),
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

    setImages((prev) => {
      const newImages = cloneDeep(prev);

      return newImages.concat(
        images.assets.map((img) => ({ uri: img.uri, name: img.name })),
      );
    });
  });

  const onLongPressImageRef = useRef(
    (event: GestureResponderEvent, image: PickedImage) => {
      const { pageX, pageY } = event.nativeEvent;
      setActionsMenu({
        image,
        anchor: { x: pageX, y: pageY },
        visible: true,
        actionKey: "",
      });
    },
  );

  const handlePressConvertToPdf = useCallback(async () => {
    setImages((prev) => {
      try {
        if (prev.length === 0) return prev;

        const uris = prev.map((image) => image.uri);
        const { filePath } = createPdf({
          name: filename + ".pdf",
          paperSize: sizePdf,
          imagePaths: uris,
        });
        const file = new ExpoFileSystem.File(URI_EXTENSION + filePath);

        shareAsync(file.uri, { mimeType: "application/pdf" });
        if (REPLACERS.isNative) deleteDirectoryPickerFolder();
        return [];
      } catch (error) {
        logger.error(
          "PDF",
          "error converting to PDF",
          (error as Error).message,
        );
        return prev;
      }
    });
  }, [sizePdf, filename]);

  const renderItem = useCallback<SortableGridRenderItem<PickedImage>>(
    ({ item }) => {
      const handleError = () => {
        setImages((prev) => prev.filter((image) => image.uri !== item.uri));
      };

      return (
        <Pressable
          style={styles.image}
          onLongPress={(event) => onLongPressImageRef.current(event, item)}
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
            {paperSizesRenderedRef.current}
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
        {t(`PDF.selectCurrentPaperSize`, { size: sizePdf })}
      </Button>

      <Divider style={styles.divider} />

      <TextInput
        value={filename}
        style={styles.textInput}
        label={t("common.fileName", { name: "" })}
        onChangeText={setFilename}
      />

      <Button mode="contained" onPress={handlePressSelectImagesRef.current}>
        {t("PDF.selectImagesToConvert")}
      </Button>

      <Divider style={styles.divider} />

      <GestureHandlerRootView>
        <Animated.ScrollView
          ref={scrollableRef}
          contentContainerStyle={styles.listContainer}
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

      <Button mode="contained" onPress={handlePressConvertToPdf}>
        {t("PDF.convertToPdf")}
      </Button>
    </View>
  );
};

export default memoDeep(PDFConverter);
