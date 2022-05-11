import { connect } from 'mongoose';
import { AbiItem, Contract, EventStoreConfig, IEventStore } from '../interface';
import { Antenna } from './antenna';

export class EventStoreMongoDB implements IEventStore {
  config: EventStoreConfig['mongodb'];

  constructor(config: EventStoreConfig['mongodb']) {
    this.config = config;
  }

  async connect(): Promise<void> {
    await connect(this.config.uri, this.config.connectionOptions);
  }

  async addEvent(
    contractAddress: string,
    abi: AbiItem[],
    {
      blockNumber,
      options,
    }: { blockNumber?: number; options?: Record<string, unknown> } = {},
  ): Promise<void> {
    let antenna = await Antenna.findOne({ contractAddress });
    if (!antenna) {
      antenna = await Antenna.create({ contractAddress });
    }

    const arr = antenna.abi || [];
    arr.push(...abi);
    antenna.abi = arr;
    if (blockNumber) {
      antenna.blockNumber = blockNumber;
    }
    if (options) {
      antenna.options = options;
    }
    await antenna.save();
  }

  async updateEvent(
    contractAddress: string,
    abi: AbiItem[],
    {
      blockNumber,
      options,
    }: { blockNumber?: number; options?: Record<string, unknown> } = {},
  ): Promise<void> {
    let antenna = await Antenna.findOne({ contractAddress });
    if (!antenna) {
      antenna = await Antenna.create({ contractAddress });
    }

    antenna.abi = abi;
    if (blockNumber) {
      antenna.blockNumber = blockNumber;
    }
    if (options) {
      antenna.options = options;
    }
    await antenna.save();
  }

  async removeEvent(contractAddress: string, eventName: string): Promise<void> {
    const antenna = await Antenna.findOne({ contractAddress });
    if (!antenna) {
      throw Error('invalid contract address');
    }

    const event = antenna.abi.find((event) => event.name === eventName);
    if (!event) {
      throw Error('invalid event name');
    }
    antenna.abi = antenna.abi.splice(antenna.abi.indexOf(event), 1);
    if (antenna.abi.length === 0) {
      await antenna.deleteOne();
    } else {
      await antenna.save();
    }
  }

  async updateBlock(
    contractAddress: string,
    blockNumber: number,
  ): Promise<void> {
    await Antenna.updateOne({ contractAddress }, { $set: { blockNumber } });
  }

  async getContract(contractAddress: string): Promise<Contract> {
    const contract = await Antenna.findOne({ contractAddress }).lean();
    if (!contract) {
      throw Error('invalidr contract address');
    }
    return {
      contractAddress: contract.contractAddress,
      abi: contract.abi,
      blockNumber: contract.blockNumber,
      options: contract.options,
    };
  }

  async getContracts(): Promise<Contract[]> {
    const contracts = await Antenna.find().lean();
    return contracts.map((contract) => ({
      contractAddress: contract.contractAddress,
      abi: contract.abi,
      blockNumber: contract.blockNumber,
      options: contract.options,
    }));
  }
}
