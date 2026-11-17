import { createContext, useContext } from 'react';

export const FieldContext = createContext(null);

export function useFieldContext() {
  return useContext(FieldContext);
}
