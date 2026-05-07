import { Screens } from "@types";
import PDFConverter from "./Converter";
import PDFViewerScreen from "./Viewer";
import { usePDFStore } from "../services/zustand";
import GetBottomNavigation from "@components/BottomNavigator/components/GetBottomNavigation";
import React, { useEffect } from "react";
import { deleteDirectoryPickerFolder, memoDeep } from "@utils";

const Navigator = GetBottomNavigation([
  {
    key: "pdfViewer",
    title: "pdf.viewer",
    component: PDFViewerScreen,
    focusedIcon: "file-pdf-box",
  },
  {
    key: "pdfConverter",
    title: "pdf.converter",
    component: PDFConverter,
    focusedIcon: "file-cog",
  },
]);

const PDFNavigator: React.FC<Screens["PDF"]> = ({ route }) => {
  const { uri } = route?.params || {};

  const setUriState = usePDFStore((s) => s.setPdfUri);

  useEffect(() => {
    if (uri) setUriState(uri);
  }, [uri, setUriState]);

  useEffect(() => {
    return () => {
      deleteDirectoryPickerFolder();
    };
  }, []);

  return <Navigator />;
};

export default memoDeep(PDFNavigator);
