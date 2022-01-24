import listenHTTP, { initializeApp } from './http';
import listenBlockchain from './blockchain';
import { createEventStoreInstance } from './eventStore';
import { createBroadcastInstance } from './producer';
import { EventStoreConfig, IEventStore } from './eventStore/interface';
import { BroadcastConfig, IProducer } from './producer/interface';

export type Config = {
  eventStore: EventStoreConfig;
  producer: BroadcastConfig;
  eventSync?: boolean;
  rpc: string;
  delayBlock?: number;
  backOffBlock?: number;
  httpPort?: number;
};

class EthereumAntenna {
  eventStore: IEventStore;
  producer: IProducer;
  rpc: string;
  eventSync?: boolean;
  delayBlock: number;
  backOffBlock: number;
  httpPort: number;

  constructor(config: Config) {
    this.eventStore = createEventStoreInstance(config.eventStore);
    this.producer = createBroadcastInstance(config.producer);
    this.rpc = config.rpc;
    this.eventSync = config.eventSync;
    this.httpPort = config.httpPort || 3000;
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

    if (this.httpPort) {
      await listenHTTP(this.httpPort, this.eventStore);
    }
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

    return initializeApp(this.eventStore);
  }

  async api() {
    await this.eventStore.connect();

    return listenHTTP(this.httpPort, this.eventStore);
  }
}

export default EthereumAntenna;
