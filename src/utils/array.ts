type NonFunctional<T> = T extends Function ? never : T;

export function enumToArray<T>(enumeration: T): NonFunctional<T[keyof T]>[] {
  return Object.values(enumeration)
    .filter((el) => typeof el !== 'number');
} 

export const arrayChunk = <T>(array: T[], chunkSize: number) =>
  [...Array(Math.ceil(array.length / chunkSize))].map((_,i) => array.slice(i*chunkSize,i*chunkSize+chunkSize))
