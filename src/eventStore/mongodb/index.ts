import { connect } from 'mongoose';
import { IEventStore, EventStoreConfig, Contract, AbiItem } from '../interface';
import { Antenna } from './antenna';

export class EventStoreMongoDB implements IEventStore {
  config: EventStoreConfig;

  constructor(config: EventStoreConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    await connect(this.config.uri, this.config.connectionOptions);
  }

  async addEvent(contractAddress: string, abi: AbiItem): Promise<void> {
    let antenna = await Antenna.findOne({ contractAddress });
    if (!antenna) {
      antenna = await Antenna.create({ contractAddress });
    }

    const arr = antenna.abi || [];
    arr.push(abi);
    antenna.abi = arr;
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
