import listenBlockchain from './blockchain';
import { createEventStoreInstance } from './eventStore';
import { createBroadcastInstance } from './producer';
import { createHttpInstance } from './http';
import {
  EventStoreConfig,
  EventStoreType,
  IEventStore,
} from './eventStore/interface';
import { BroadcastConfig, IProducer } from './producer/interface';
import { HttpConfig, IHttp } from './http/interface';

export type Config = {
  eventStore: EventStoreConfig[EventStoreType];
  producer: BroadcastConfig;
  http: HttpConfig;
  rpc: string;
  delayBlock?: number;
  blockPerSecond?: number;
  backOffBlock?: number;
  threshold?: number;
  limit?: number;
};

class EthereumAntenna {
  eventStore: IEventStore;
  producer: IProducer;
  http: IHttp;
  rpc: string;
  eventSync?: boolean;
  delayBlock: number;
  blockPerSecond: number;
  backOffBlock: number;
  threshold: number;
  limit: number;

  constructor(config: Config) {
    this.eventStore = createEventStoreInstance(config.eventStore);
    this.producer = createBroadcastInstance(config.producer);
    this.http = createHttpInstance(config.http);
    this.rpc = config.rpc;
    this.delayBlock = config.delayBlock || 0;
    this.blockPerSecond = config.blockPerSecond || 3;
    this.backOffBlock = config.backOffBlock || 50;
    this.threshold = config.threshold || 50;
    this.limit = config.limit || 1000;
  }

  async run() {
    await this.eventStore.connect();
    await this.producer.connect();

    await listenBlockchain({
      rpc: this.rpc,
      delayBlock: this.delayBlock,
      blockPerSecond: this.blockPerSecond,
      backOffBlock: this.backOffBlock,
      threshold: this.threshold,
      limit: this.limit,
      eventStore: this.eventStore,
      producer: this.producer,
    });

    await this.http.listenHTTP({ eventStore: this.eventStore });
  }

  async listen() {
    await this.eventStore.connect();
    await this.producer.connect();

    await listenBlockchain({
      rpc: this.rpc,
      delayBlock: this.delayBlock,
      blockPerSecond: this.blockPerSecond,
      backOffBlock: this.backOffBlock,
      threshold: this.threshold,
      limit: this.limit,
      eventStore: this.eventStore,
      producer: this.producer,
    });
  }

  async getApp() {
    await this.eventStore.connect();

    return this.http.initializeApp({ eventStore: this.eventStore });
  }

  async api() {
    await this.eventStore.connect();

    return this.http.listenHTTP({ eventStore: this.eventStore });
  }
}

export default EthereumAntenna;
