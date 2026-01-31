import Animated, {
  withTiming,
  useSharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import ColorPicker, {
  Panel1,
  HueCircular,
  ColorFormatsObject,
} from "reanimated-color-picker";
import QR from "react-native-qrcode-svg";
import { View } from "react-native";
import { useLanguage } from "@context/LanguageContext";
import { useStylesQR } from "@styles/screens/QR/useStylesQR";
import { downloadBase64 } from "@utils";
import { DownloadableMimeType } from "@types";
import { useEffect, useRef, useState } from "react";
import { Button, Portal, Divider, TextInput } from "react-native-paper";

type Selection = "none" | "color" | "bgColor";

const DEFAULTS = {
  color: "#FFFFFF",
  bgColor: "#000000",
};

const CreateQR = () => {
  const { t } = useLanguage();
  const { styles, height } = useStylesQR();

  const [selecting, setSelecting] = useState<Selection>("none");

  const [color, setColor] = useState(DEFAULTS.color);
  const [valueQR, setValueQR] = useState("");
  const [bgColor, setBgColor] = useState(DEFAULTS.bgColor);

  const translateY = useSharedValue(height * 2);
  const colorShared = useSharedValue(color);
  const bgColorShared = useSharedValue(bgColor);
  const selectingShared = useSharedValue<Selection>(selecting);

  const animatedStyle = useAnimatedStyle(() => {
    let bgColor = "transparent";
    if (selectingShared.value === "color") {
      bgColor = colorShared.value;
    } else if (selectingShared.value === "bgColor") {
      bgColor = bgColorShared.value;
    }

    return {
      transform: [{ translateY: translateY.value }],
      backgroundColor: bgColor,
    };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svgRef = useRef<any>(null);

  const clearInputRef = useRef(() => {
    setValueQR("");
  });

  const setDefaultsRef = useRef(() => {
    setColor(DEFAULTS.color);
    setBgColor(DEFAULTS.bgColor);
    colorShared.value = DEFAULTS.color;
    bgColorShared.value = DEFAULTS.bgColor;
  });

  const onColorChangeRef = useRef((colors: ColorFormatsObject) => {
    "worklet";

    if (selecting === "color") {
      colorShared.value = colors.hex;
    } else if (selecting === "bgColor") {
      bgColorShared.value = colors.hex;
    }
  });

  const onColorPickRef = useRef((colors: ColorFormatsObject) => {
    if (selecting === "color") setColor(colors.hex);
    else if (selecting === "bgColor") setBgColor(colors.hex);
  });

  const downloadQRCodeRef = useRef(async () => {
    if (!svgRef.current) return;

    const base64 = await new Promise<string>((resolve) => {
      svgRef.current?.toDataURL((data: string) => {
        resolve(data);
      });
    });
    let typeFile: DownloadableMimeType = "image/png";

    if (base64.startsWith("data:")) {
      const match = base64.match(/^data:(image\/[a-zA-Z]+);base64,/);
      if (match && match[1]) typeFile = match[1] as DownloadableMimeType;
    }

    await downloadBase64({
      directory: "images",
      fileName: `QR_${Date.now()}.png`,
      typeFile,
      uri: base64.startsWith("data:")
        ? base64
        : `data:${typeFile};base64,${base64}`,
    });
  });

  useEffect(() => {
    selectingShared.value = selecting;

    const y = selecting === "none" ? height * 2 : 0;
    translateY.value = withTiming(y, { duration: 300 });
  }, [selecting, height, translateY, selectingShared]);

  return (
    <View style={styles.container}>
      <Portal>
        <Animated.View style={[styles.containerModal, animatedStyle]}>
          <ColorPicker
            value={selecting === "color" ? color : bgColor}
            sliderThickness={20}
            thumbSize={24}
            onChange={onColorChangeRef.current}
            onCompleteJS={onColorPickRef.current}
            style={styles.colorPicker}
            boundedThumb
          >
            <HueCircular
              containerStyle={styles.colorPickerHue}
              thumbShape="pill"
            >
              <Panel1 style={styles.colorPickerPanel} />
            </HueCircular>
          </ColorPicker>

          <Button
            mode="contained"
            onPress={() => setSelecting("none")}
            style={styles.button}
          >
            {t("colors.selectColor")}
          </Button>
        </Animated.View>
      </Portal>

      <TextInput
        label={t("QR.writeData")}
        value={valueQR}
        onChangeText={setValueQR}
        style={styles.textInput}
        right={
          valueQR.length && (
            <TextInput.Icon
              icon="close-circle"
              onPress={clearInputRef.current}
            />
          )
        }
      />

      <Divider style={styles.divider} />

      <View style={styles.containerButtons}>
        <Button
          mode="outlined"
          onPress={() => setSelecting("color")}
          style={styles.button}
        >
          {t("colors.selectColor")}
        </Button>
        <Button
          mode="outlined"
          onPress={() => setSelecting("bgColor")}
          style={styles.button}
        >
          {t("colors.selectBg")}
        </Button>
      </View>

      <Button
        mode="outlined"
        onPress={setDefaultsRef.current}
        style={styles.button}
      >
        {t("colors.setDefaults")}
      </Button>

      <Divider style={styles.divider} />

      <QR
        value={valueQR || t("default")}
        size={300}
        getRef={(r) => (svgRef.current = r)}
        color={color}
        backgroundColor={bgColor}
      />

      <Button
        mode="contained"
        style={styles.button}
        onPress={downloadQRCodeRef.current}
      >
        {t("common.download")}
      </Button>
    </View>
  );
};

export default CreateQR;
