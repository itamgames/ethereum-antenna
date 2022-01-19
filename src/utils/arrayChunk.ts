export const arrayChunk = <T>(array: T[], chunkSize: number) =>
  [...Array(Math.ceil(array.length / chunkSize))].map((_,i) => array.slice(i*chunkSize,i*chunkSize+chunkSize))
