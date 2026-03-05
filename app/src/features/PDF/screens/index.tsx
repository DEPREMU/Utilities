import PDFConverter from "./Converter";
import PDFViewerScreen from "./Viewer";
import GetBottomNavigation from "@/common/components/BottomNavigator/components/GetBottomNavigation";
import React, { useEffect, useMemo } from "react";
import { deleteDirectoryPickerFolder, memoDeep } from "@utils";

type ViewerProps = {
  route?: {
    params?: {
      uri?: string;
    };
  };
};

const PDFNavigator: React.FC<ViewerProps> = ({ route }) => {
  const { uri } = route?.params || {};

  const Navigator = useMemo(
    () =>
      GetBottomNavigation(
        [
          {
            key: "pdfViewer" as const,
            title: "PDF.viewer",
            focusedIcon: "file-pdf-box",
          },
          {
            key: "pdfConverter" as const,
            title: "PDF.converter",
            focusedIcon: "file-cog",
          },
        ],
        {
          pdfViewer: () => <PDFViewerScreen uri={uri} />,
          pdfConverter: PDFConverter,
        },
      ),
    [uri],
  );

  useEffect(() => deleteDirectoryPickerFolder, []);

  return <Navigator />;
};

export default memoDeep(PDFNavigator);
