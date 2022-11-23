export type KeysOfType<T, V> = keyof {
  [P in keyof T as T[P] extends V | undefined ? P : never]: P;
};
