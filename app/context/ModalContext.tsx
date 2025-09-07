import React, {
  useRef,
  useState,
  ReactNode,
  useContext,
  createContext,
  useCallback,
} from "react";
import ModalComponent from "@components/common/ModalComponent";
import SnackBarComponent from "@components/common/SnackBarComponent";
import { SnackbarProps } from "react-native-paper";
import { StyleSheet, View } from "react-native";

export type StylesModal =
  | "body"
  | "title"
  | "buttons"
  | "overlay"
  | "modal"
  | "messageText";

interface ModalContextProps {
  openModal: (
    title: string,
    body: ReactNode | string,
    buttons: ReactNode,
  ) => void;
  closeModal: () => void;
  setCustomStyles: React.Dispatch<
    React.SetStateAction<Record<StylesModal, object> | undefined>
  >;
  openSnackBar: (
    label: string,
    duration?: number,
    action?: SnackbarProps["action"],
  ) => void;
}

interface ModalProviderProps {
  children: ReactNode;
}

interface SnackBarConfig {
  id: string;
  label: string;
  duration: number;
  action?: SnackbarProps["action"];
  timeout?: number | NodeJS.Timeout;
}

/**
 * ModalContext provides a way to manage the state and behavior of a modal component.
 *
 * It allows components to open and close the modal, set its title, body, and buttons.
 *
 * @context
 * @property {function} openModal - Function to open the modal with a specified title, body, and buttons.
 * @property {function} closeModal - Function to close the modal and reset its state.
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
 * @property {function} openModal - Function to open the modal with a specified title, body, and buttons.
 * @property {function} closeModal - Function to close the modal and reset its state.
 */
export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  const idTimeout = useRef<NodeJS.Timeout | null>(null);
  const [body, setBody] = useState<ReactNode | string>(null);
  const [title, setTitle] = useState<string>("");
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [buttons, setButtons] = useState<ReactNode>(null);
  const [hideModal, setHideModal] = useState<boolean>(true);
  const [customStyles, setCustomStyles] = useState<
    Record<StylesModal, object> | undefined
  >(undefined);

  const [snackbar, setSnackbar] = useState<SnackBarConfig[]>([]);

  /**
   * Clears the timeout stored in `idTimeout.current` if it exists.
   *
   * This function is used to prevent memory leaks and ensure that the timeout
   * does not execute after the modal has been closed or reset.
   */
  const clearIdTimeout = useCallback(() => {
    if (!idTimeout.current) return;

    clearTimeout(idTimeout.current);
    idTimeout.current = null;
  }, []);

  /**
   * Opens a modal with the specified title, body, and buttons.
   *
   * @param modalTitle - The title to display in the modal.
   * @param modalBody - The content to display in the body of the modal. This should be a ReactNode.
   * @param modalButtons - The buttons to display in the modal footer. This should be a ReactNode.
   *
   * @remarks
   * This function clears any existing timeout before setting the modal's title, body, and buttons,
   * and then opens the modal by setting its state to open.
   */
  const openModal = useCallback(
    (
      modalTitle: string,
      modalBody: ReactNode | string,
      modalButtons: ReactNode,
    ) => {
      setIsOpen((prev) => {
        if (prev) return prev;

        clearIdTimeout();

        setTitle(modalTitle);
        setBody(modalBody);
        setButtons(modalButtons);
        return true;
      });
    },
    [clearIdTimeout],
  );

  /**
   * Closes the modal by performing the following actions:
   * - Clears any existing timeout using `clearIdTimeout`.
   * - Sets the modal's open state to `false`.
   * - Schedules a timeout to reset the modal's title, body, and buttons after 1 second.
   *
   * Note: Ensure that `clearIdTimeout` properly clears the timeout stored in `idTimeout.current`.
   */
  const closeModal = useCallback(() => {
    clearIdTimeout();

    setIsOpen(false);
    idTimeout.current = setTimeout(() => {
      setTitle("");
      setBody(null);
      setButtons(null);
    }, 1000);
  }, [clearIdTimeout]);

  /**
   * Opens a snackbar with the specified label, duration, and action.
   *
   * @param label - The label to display in the snackbar.
   * @param duration - The duration for which the snackbar should be visible (in milliseconds).
   * @param action - An optional action button for the snackbar.
   */
  const openSnackBar = useCallback(
    (
      label: string,
      duration: number = 3000,
      action?: SnackbarProps["action"],
    ) => {
      setSnackbar((prev) => {
        const id = Math.random().toString(36).substring(2, 15);

        const timeout = setTimeout(() => {
          setSnackbar((prev) => prev.filter((snackbar) => snackbar.id !== id));
        }, duration);

        return [...prev, { label, duration, action, id, timeout }];
      });
    },
    [],
  );

  /**
   * Dismisses a snackbar with the specified id.
   *
   * @param id - The id of the snackbar to dismiss.
   */
  const onDismissSnackbar = useCallback((id: string) => {
    setSnackbar((prev) => {
      const snackbar = prev.find((snackbar) => snackbar.id === id);
      if (snackbar?.timeout) clearTimeout(snackbar.timeout);

      return prev.filter((snackbar) => snackbar.id !== id);
    });
  }, []);

  return (
    <ModalContext.Provider
      value={{ openModal, closeModal, setCustomStyles, openSnackBar }}
    >
      <View style={styles.snackbarContainer}>
        {snackbar.map((snackbar) => (
          <SnackBarComponent
            key={snackbar.id}
            label={snackbar.label}
            actionSnackbar={snackbar.action}
            id={snackbar.id}
            onDismiss={onDismissSnackbar}
          />
        ))}
      </View>
      <ModalComponent
        onClose={closeModal}
        title={title}
        body={body}
        buttons={buttons}
        isOpen={isOpen}
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
 *  const { openModal, closeModal } = useModal();
 *
 *  const handlePress = () => {
 *    const customStyles = StyleSheet.create({
 *      button: { backgroundColor: "black" },
 *      textButton: { color: "green" },
 *    });
 *    openModal(
 *      "Test Modal",
 *      <Text>This is a test modal body</Text>,
 *      <ButtonComponent
 *        label="Close Modal"
 *        handlePress={closeModal}
 *        customStyles={customStyles}
 *      />
 *    );
 *  };
 */
export const useModal = (): ModalContextProps => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
};
