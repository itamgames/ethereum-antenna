import Koa from 'koa';
import { IEventStore } from "../eventStore/interface";

type KoaConfig = {
  type: 'koa';
  port?: number;
  prefix?: string;
};

export type HttpConfig = KoaConfig;

export interface IHttp {
  initializeApp({ eventStore }: { eventStore: IEventStore }): Koa;
  listenHTTP({ eventStore }: { eventStore: IEventStore }): void;
}