import { useLanguage } from "@context/LanguageContext";
import useStylesSnackBarComponent from "@styles/components/useStylesSnackbarComponent";
import { Snackbar, SnackbarProps, Text } from "react-native-paper";
import React, { memo, useCallback, useMemo } from "react";

interface SnackBarComponentProps {
  label: string;
  id: string;
  onDismiss: (id: string) => void;
  actionSnackbar?: SnackbarProps["action"];
}

const SnackBarComponent: React.FC<SnackBarComponentProps> = ({
  actionSnackbar,
  label,
  id,
  onDismiss,
}) => {
  const { t } = useLanguage();
  const { styles } = useStylesSnackBarComponent();

  const onDismissCall = useCallback(() => onDismiss(id), [onDismiss, id]);

  const actionFallback: SnackbarProps["action"] = useMemo(
    () => ({
      label: t("undo"),
      onPress: onDismissCall,
      labelStyle: styles.actionText,
    }),
    [onDismissCall, t, styles.actionText],
  );

  const action = useMemo(
    () => ({ ...actionFallback, ...actionSnackbar }),
    [actionSnackbar, actionFallback],
  );

  return (
    <Snackbar
      visible
      style={styles.snackbar}
      action={action}
      onDismiss={onDismissCall}
      wrapperStyle={styles.container}
    >
      <Text style={styles.textSnackbar}>{label}</Text>
    </Snackbar>
  );
};

const SnackBarComponentMemo = memo(
  SnackBarComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.label === nextProps.label &&
      prevProps.onDismiss === nextProps.onDismiss &&
      prevProps.id === nextProps.id &&
      prevProps.actionSnackbar === nextProps.actionSnackbar
    );
  },
);

export default SnackBarComponentMemo;
