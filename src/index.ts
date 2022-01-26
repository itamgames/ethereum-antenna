import listenBlockchain from './blockchain';
import { createEventStoreInstance } from './eventStore';
import { createBroadcastInstance } from './producer';
import { createHttpInstance } from './http';
import { EventStoreConfig, IEventStore } from './eventStore/interface';
import { BroadcastConfig, IProducer } from './producer/interface';
import { HttpConfig, IHttp } from './http/interface';

export type Config = {
  eventStore: EventStoreConfig;
  producer: BroadcastConfig;
  http: HttpConfig;
  eventSync?: boolean;
  rpc: string;
  delayBlock?: number;
  backOffBlock?: number;
};

class EthereumAntenna {
  eventStore: IEventStore;
  producer: IProducer;
  http: IHttp;
  rpc: string;
  eventSync?: boolean;
  delayBlock: number;
  backOffBlock: number;

  constructor(config: Config) {
    this.eventStore = createEventStoreInstance(config.eventStore);
    this.producer = createBroadcastInstance(config.producer);
    this.http = createHttpInstance(config.http);
    this.rpc = config.rpc;
    this.eventSync = config.eventSync;
    this.delayBlock = config.delayBlock || 0;
    this.backOffBlock = config.backOffBlock || 50;
  }

  async run() {
    await this.eventStore.connect();
    await this.producer.connect();

    await listenBlockchain({
      eventSync: this.eventSync,
      rpc: this.rpc,
      delayBlock: this.delayBlock,
      backOffBlock: this.backOffBlock,
      eventStore: this.eventStore,
      producer: this.producer
    });

    await this.http.listenHTTP({ eventStore: this.eventStore });
  }

  async listen() {
    await this.eventStore.connect();
    await this.producer.connect();

    await listenBlockchain({
      eventSync: this.eventSync,
      rpc: this.rpc,
      delayBlock: this.delayBlock,
      backOffBlock: this.backOffBlock,
      eventStore: this.eventStore,
      producer: this.producer
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
