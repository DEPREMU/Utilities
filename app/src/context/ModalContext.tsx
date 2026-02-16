import React, {
  useRef,
  useMemo,
  useState,
  useEffect,
  ReactNode,
  useContext,
  createContext,
} from "react";
import { modalRef } from "@refs";
import ModalComponent from "@/common/components/ModalComponent";
import SnackBarComponent from "@/common/components/SnackBarComponent";
import { SnackbarProps } from "react-native-paper";
import { StyleSheet, View } from "react-native";
import { clearTimeoutPolyfill, setTimeoutPolyfill } from "@utils";

export type StylesModal =
  | "body"
  | "title"
  | "buttons"
  | "overlay"
  | "modal"
  | "messageText";

interface ModalContextProps {
  setCustomStyles: React.Dispatch<
    React.SetStateAction<Record<StylesModal, object> | undefined>
  >;
}

interface ModalProviderProps {
  children: ReactNode;
}

interface SnackBarConfig {
  id: string;
  label: string;
  duration: number;
  action?: SnackbarProps["action"];
  timeout?: number;
}

/**
 * ModalContext provides a way to manage the state and behavior of a modal component.
 *
 * It allows components to open and close the modal, set its title, body, and buttons.
 *
 * @context
 * @property {function} openModalRef - Function to open the modal with a specified title, body, and buttons.
 * @property {function} closeModalRef - Function to close the modal and reset its state.
 */
const ModalContext = createContext<ModalContextProps | undefined>(undefined);

/**
 * Provides a context for managing a modal's state and behavior.
 *
 * This context allows components to open and close a modal, as well as set its title, body, and buttons.
 *
 * @component
 * @param {ReactNode} children - The child components that will have access to the modal context.
 *
 * @context
 * @property {boolean} isOpen - Indicates whether the modal is currently open.
 * @property {string} title - The title of the modal.
 * @property {ReactNode} body - The content/body of the modal.
 * @property {ReactNode} buttons - The buttons to be displayed in the modal.
 * @property {function} openModalRef - Function to open the modal with a specified title, body, and buttons.
 * @property {function} closeModalRef - Function to close the modal and reset its state.
 */
export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  const [body, setBody] = useState<ReactNode | string>(null);
  const [title, setTitle] = useState<string>("");
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [buttons, setButtons] = useState<ReactNode>(null);
  const [hideModal, setHideModal] = useState<boolean>(true);
  const [customStyles, setCustomStyles] = useState<
    Record<StylesModal, object> | undefined
  >(undefined);
  const [snackbar, setSnackbar] = useState<SnackBarConfig[]>([]);

  const idTimeout = useRef<number | null>(null);
  const onDismissRef = useRef<() => void>(() => {});
  const clearIdTimeout = useRef(() => clearTimeoutPolyfill(idTimeout));

  /**
   * Dismisses a snackbar with the specified id.
   *
   * @param id - The id of the snackbar to dismiss.
   */
  const onDismissSnackbarRef = useRef((id: string) => {
    setSnackbar((prev) => {
      const snackbar = prev.find((snackbar) => snackbar.id === id);
      if (snackbar?.timeout) clearTimeoutPolyfill(snackbar.timeout);

      return prev.filter((snackbar) => snackbar.id !== id);
    });
  });

  useEffect(() => {
    modalRef.openModal = (modalTitle, modalBody, modalButtons, onDismiss) => {
      setIsOpen((prev) => {
        if (prev) return prev;

        clearIdTimeout.current();

        onDismissRef.current =
          typeof onDismiss === "function" ? onDismiss : () => {};

        setTitle(modalTitle);
        setBody(modalBody);
        setButtons(modalButtons);
        return true;
      });
    };

    modalRef.closeModal = () => {
      clearIdTimeout.current();

      setIsOpen(false);
      idTimeout.current = setTimeoutPolyfill(() => {
        setTitle("");
        setBody(null);
        setButtons(null);
      }, 1000);
    };

    modalRef.openSnackBar = (label, duration?, action?) => {
      setSnackbar((prev) => {
        if (!duration || duration <= 0) duration = 5000;

        const id = Math.random().toString(36).substring(2, 15);

        const timeout = setTimeoutPolyfill(() => {
          setSnackbar((prev) => prev.filter((snackbar) => snackbar.id !== id));
        }, duration);

        return [...prev, { label, duration: duration, action, id, timeout }];
      });
    };
  }, []);

  useEffect(() => {
    if (isOpen) return;

    onDismissRef.current();
    onDismissRef.current = () => {};
  }, [isOpen]);

  const value: ModalContextProps = useMemo(
    () => ({
      setCustomStyles,
    }),
    [],
  );

  return (
    <ModalContext.Provider value={value}>
      <View style={styles.snackbarContainer} pointerEvents="box-none">
        {snackbar.map((snackbar) => (
          <SnackBarComponent
            key={snackbar.id}
            label={snackbar.label}
            actionSnackbar={snackbar.action}
            id={snackbar.id}
            onDismiss={onDismissSnackbarRef.current}
          />
        ))}
      </View>
      <ModalComponent
        body={body}
        title={title}
        isOpen={isOpen}
        onClose={modalRef.closeModal as () => void}
        buttons={buttons}
        hideModal={hideModal}
        setHideModal={setHideModal}
        customStyles={customStyles}
      />
      {children}
    </ModalContext.Provider>
  );
};

const styles = StyleSheet.create({
  snackbarContainer: {
    position: "absolute",
    zIndex: 1000,
    top: 0,
    width: "100%",
    justifyContent: "flex-start",
    alignItems: "flex-end",
  },
});

/**
 * Custom hook to access the ModalContext.
 *
 * This hook provides the context value for managing modal state and actions.
 * It ensures that the hook is used within a `ModalProvider` by throwing an error
 * if the context is not available.
 *
 * @throws {Error} If the hook is used outside of a `ModalProvider`.
 * @returns {ModalContextProps} The context value for modal management.
 *
 * @example
 *  const { openModalRef, closeModalRef } = useModal();
 *
 *  const handlePress = () => {
 *    const customStyles = StyleSheet.create({
 *      button: { backgroundColor: "black" },
 *      textButton: { color: "green" },
 *    });
 *    openModalRef.current(
 *      "Test Modal",
 *      <Text>This is a test modal body</Text>,
 *      <ButtonComponent
 *        label="Close Modal"
 *        handlePress={closeModalRef}
 *        customStyles={customStyles}
 *      />
 *    );
 *  };
 */
export const useModal = (): ModalContextProps => {
  const context = useContext(ModalContext);
  if (!context) throw new Error("useModal must be used within a ModalProvider");

  return context;
};
