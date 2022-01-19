type NonFunctional<T> = T extends Function ? never : T;

export function enumToArray<T>(enumeration: T): NonFunctional<T[keyof T]>[] {
  return Object.values(enumeration)
    .filter((el) => typeof el !== 'number');
} 