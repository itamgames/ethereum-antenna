import listenHTTP from './http';
import listenBlockchain from './blockchain';
import { createEventStoreInstance } from './eventStore';
import { createBroadcastInstance } from './producer';
import { EventStoreConfig, IEventStore } from './eventStore/interface';
import { BroadcastConfig, IProducer } from './producer/interface';

export type Config = {
  eventStore: EventStoreConfig;
  producer: BroadcastConfig;
  rpc: string;
  blockPerSecond: number;
  delayBlock?: number;
  backOffBlock?: number;
  httpPort?: number;
};

class EthereumAntenna {
  eventStore: IEventStore;
  producer: IProducer;
  rpc: string;
  blockPerSecond: number;
  delayBlock: number;
  backOffBlock: number;
  httpPort: number | undefined;

  constructor(config: Config) {
    this.eventStore = createEventStoreInstance(config.eventStore);
    this.producer = createBroadcastInstance(config.producer);
    this.rpc = config.rpc;
    this.blockPerSecond = config.blockPerSecond;
    this.httpPort = config.httpPort;
    this.delayBlock = config.delayBlock || 0;
    this.backOffBlock = config.backOffBlock || 0;
  }

  async listen() {
    await this.eventStore.connect();
    await this.producer.connect();

    listenBlockchain(this.rpc, this.blockPerSecond, this.delayBlock, this.backOffBlock, this.eventStore, this.producer);

    if (this.httpPort) {
      listenHTTP(this.httpPort, this.eventStore);
    }
  }
}

export default EthereumAntenna;
