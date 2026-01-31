import PDFConverter from "./Converter";
import PDFViewerScreen from "./Viewer";
import GetBottomNavigation from "@components/common/GetBottomNavigation";
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

  const returnValue = useMemo(
    () =>
      GetBottomNavigation(
        [
          {
            key: "pdfViewer",
            title: "PDF.viewer",
            focusedIcon: "file-pdf-box",
          },
          {
            key: "pdfConverter",
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

  return returnValue();
};

export default memoDeep(PDFNavigator);
