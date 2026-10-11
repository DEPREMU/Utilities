import { ReactNode } from "react";
import { SnackbarProps } from "react-native-paper";
import { Timers } from "@common";

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
  readonly isReady: boolean;
  waitUntilReady: (timeoutMs?: number) => Promise<boolean>;
};

let actualOpenModal: OpenModal | null = null;
let actualCloseModal: (() => void) | null = null;
let actualOpenSnackBar: OpenSnackBar | null = null;
let isModalReady = false;

type QueuedModal = {
  title: string;
  body: ReactNode | string;
  buttons: ReactNode;
  onDismiss?: () => void;
};
let queuedModal: QueuedModal | null = null;

const readyListeners: (() => void)[] = [];

const notifyReady = () => {
  isModalReady = true;

  if (queuedModal && actualOpenModal) {
    const { title, body, buttons, onDismiss } = queuedModal;
    queuedModal = null;
    actualOpenModal(title, body, buttons, onDismiss);
  }

  while (readyListeners.length > 0) {
    const listener = readyListeners.shift();
    listener?.();
  }
};

export const modalRef: ModalRef = {
  get isReady(): boolean {
    return isModalReady && actualOpenModal !== null;
  },

  get openModal(): OpenModal | null {
    return (modalTitle, modalBody, modalButtons, onDismiss) => {
      if (actualOpenModal) {
        actualOpenModal(modalTitle, modalBody, modalButtons, onDismiss);
      } else {
        queuedModal = {
          title: modalTitle,
          body: modalBody,
          buttons: modalButtons,
          onDismiss,
        };
      }
    };
  },

  set openModal(fn: OpenModal | null) {
    actualOpenModal = fn;
    if (fn) {
      notifyReady();
    } else {
      isModalReady = false;
    }
  },

  get closeModal(): (() => void) | null {
    return () => {
      queuedModal = null;
      actualCloseModal?.();
    };
  },

  set closeModal(fn: (() => void) | null) {
    actualCloseModal = fn;
  },

  get openSnackBar(): OpenSnackBar | null {
    return (label, duration, action) => {
      if (actualOpenSnackBar) {
        actualOpenSnackBar(label, duration, action);
      }
    };
  },

  set openSnackBar(fn: OpenSnackBar | null) {
    actualOpenSnackBar = fn;
  },

  waitUntilReady: async (timeoutMs: number = 30000): Promise<boolean> => {
    if (isModalReady && actualOpenModal !== null) return true;

    return new Promise<boolean>((resolve) => {
      let timeoutId: number | null = null;

      const onReady = () => {
        if (timeoutId !== null) Timers.clearTimeout(timeoutId);
        resolve(true);
      };

      timeoutId = Timers.setTimeout(() => {
        const idx = readyListeners.indexOf(onReady);
        if (idx !== -1) readyListeners.splice(idx, 1);
        resolve(isModalReady && actualOpenModal !== null);
      }, timeoutMs);

      readyListeners.push(onReady);
    });
  },
};
