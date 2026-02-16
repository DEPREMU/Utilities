import { ReactNode } from "react";
import { SnackbarProps } from "react-native-paper";

export type OpenModal = (
  title: string,
  body: ReactNode | string,
  buttons: ReactNode,
  onDismiss?: () => void,
) => void;

export type OpenSnackBar = (
  label: string,
  duration?: number,
  action?: SnackbarProps["action"],
) => void;

export type ModalRef = {
  openModal: OpenModal | null;
  closeModal: (() => void) | null;
  openSnackBar: OpenSnackBar | null;
};

export const modalRef: ModalRef = {
  openModal: null,
  closeModal: null,
  openSnackBar: null,
};
