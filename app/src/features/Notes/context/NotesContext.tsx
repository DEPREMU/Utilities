import useNotes from "@screens/Notes/hooks/useNotes";
import React, { createContext, useContext } from "react";

type NotesContextProps = ReturnType<typeof useNotes>;

const NotesContext = createContext<NotesContextProps | undefined>(undefined);

export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const value = useNotes();

  return (
    <NotesContext.Provider value={value}>{children}</NotesContext.Provider>
  );
};

export const useNotesFeature = (): NotesContextProps => {
  const context = useContext(NotesContext);
  if (!context)
    throw new Error("useNotesFeature must be used inside NotesProvider");
  return context;
};
