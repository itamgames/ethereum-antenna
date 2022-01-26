import { HttpConfig } from './interface';
import { HttpKoa } from './koa';

export function createHttpInstance(config: HttpConfig) {
  const types = {
    koa: HttpKoa,
  };

  const HttpClass = types[config.type];
  if (!HttpClass) {
    throw new Error("invalid event store type.");
  }

  return new HttpClass(config);
}
