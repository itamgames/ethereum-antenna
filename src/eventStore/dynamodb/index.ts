import { AbiItem, Contract, EventStoreConfig, IEventStore } from '../interface';

export class EventStoreDynamoDB implements IEventStore {
  config: EventStoreConfig['dynamodb'];

  constructor(config: EventStoreConfig['dynamodb']) {
    this.config = config;
  }

  async connect(): Promise<void> {}

  async addEvent(
    contractAddress: string,
    abi: AbiItem,
    {
      blockNumber,
      options,
    }: { blockNumber?: number; options?: Record<string, unknown> } = {},
  ): Promise<void> {}

  async updateEvent(
    contractAddress: string,
    abi: AbiItem[],
    {
      blockNumber,
      options,
    }: { blockNumber?: number; options?: Record<string, unknown> } = {},
  ): Promise<void> {}

  async removeEvent(
    contractAddress: string,
    eventName: string,
  ): Promise<void> {}

  async updateBlock(
    contractAddress: string,
    blockNumber: number,
  ): Promise<void> {}

  getContract(contractAddress: string): Promise<Contract> {
    throw new Error('Method not implemented.');
  }

  getContracts(): Promise<Contract[]> {
    throw new Error('Method not implemented.');
  }
}
