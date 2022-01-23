import listenHTTP from './http';
import listenBlockchain from './blockchain';
import { createEventStoreInstance } from './eventStore';
import { createBroadcastInstance } from './producer';
import { EventStoreConfig, IEventStore } from './eventStore/interface';
import { BroadcastConfig, IProducer } from './producer/interface';

export type Config = {
  eventStore: EventStoreConfig;
  producer: BroadcastConfig;
  type: 'standalone' | 'depend';
  eventSync?: boolean;
  rpc: string;
  blockPerSecond?: number;
  delayBlock?: number;
  backOffBlock?: number;
  httpPort?: number;
};

class EthereumAntenna {
  eventStore: IEventStore;
  producer: IProducer;
  rpc: string;
  type: 'standalone' | 'depend';
  eventSync?: boolean;
  blockPerSecond?: number;
  delayBlock: number;
  backOffBlock: number;
  httpPort: number | undefined;

  constructor(config: Config) {
    this.eventStore = createEventStoreInstance(config.eventStore);
    this.producer = createBroadcastInstance(config.producer);
    this.rpc = config.rpc;
    this.type = config.type;
    this.eventSync = config.eventSync;
    this.blockPerSecond = config.blockPerSecond;
    this.httpPort = config.httpPort;
    this.delayBlock = config.delayBlock || 0;
    this.backOffBlock = config.backOffBlock || 0;
  }

  async run() {
    await this.eventStore.connect();
    await this.producer.connect();

    await listenBlockchain({
      type: this.type,
      eventSync: this.eventSync,
      rpc: this.rpc,
      blockPerSecond: this.type === 'standalone' ? this.blockPerSecond : undefined,
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
      type: this.type,
      eventSync: this.eventSync,
      rpc: this.rpc,
      blockPerSecond: this.type === 'standalone' ? this.blockPerSecond : undefined,
      delayBlock: this.delayBlock,
      backOffBlock: this.backOffBlock,
      eventStore: this.eventStore,
      producer: this.producer
    });
  }

  async api() {
    await this.eventStore.connect();

    if (!this.httpPort) {
      throw new Error('http port is required');
    }

    return listenHTTP(this.httpPort, this.eventStore);
  }
}

export default EthereumAntenna;
