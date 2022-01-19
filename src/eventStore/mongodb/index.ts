import { connect } from 'mongoose';
import { IEventStore, EventStoreConfig, AbiItem, Event } from '../interface';
import { ContractModel } from './contract';

export class EventStoreMongoDB implements IEventStore {
  config: EventStoreConfig;

  constructor(config: EventStoreConfig) {
    this.config = config;
  }

  async connect() {
    // pass
    await connect(this.config.uri, this.config.connectionOptions);
  }

  async addEvent({ address, abi, trackedBlock, options }: Event) {
    const event = await ContractModel.findOne({ address });
    if (event) {
      throw Error(`Event ${address} already exists`);
    }
    const contract = new ContractModel({ address, trackedBlock, options });
    if (Array.isArray(abi)) {
      const eventNames = abi.map(item => item.name);
      const parameters = abi.map(item => item.inputs?.map(input => input.type ));
      contract.events = eventNames.map((name, index) => ({ format: `${name}(${parameters[index]?.join(',')})`, abi: abi[index] }));
    } else {
      contract.events = [{ format: `${abi.name}(${abi.inputs?.map(input => ({ type: input.type, name: input.name }))})`, abi }];
    }
    await contract.save();
  }

  async updateEvent({ address, abi, trackedBlock, options }: Partial<Event>) {
    const contract = await ContractModel.findOne({ address });
    if (!contract) {
      throw Error(`Event ${address} does not exist`);
    }
    if (Array.isArray(abi)) {
      const eventNames = abi.map(item => item.name);
      const parameters = abi.map(item => item.inputs?.map(input => input.type ));
      contract.events = eventNames.map((name, index) => ({ format: `${name}(${parameters[index]?.join(',')})`, abi: abi[index] }));
    } else {
      if (abi) {
        contract.events = [{ format: `${abi.name}(${abi.inputs?.map(input => ({ type: input.type, name: input.name }))})`, abi }];
      }
    }
    if (trackedBlock) {
      contract.trackedBlock = trackedBlock;
    }
    if (options) {
      contract.options = options;
    }
    await contract.save();
  }

  async updateBlock(address: string, blockNumber: number) {
    await ContractModel.findOneAndUpdate({ address }, { $set: { trackedBlock: blockNumber } });
  }

  async removeEvent(eventId: string) {
    await ContractModel.deleteOne({ _id: eventId });
  }

  async getContracts(address?: string) {
    const params = { address };
    const filters = Object.fromEntries(Object.entries(params).filter(([_, v]) => !!v));
    return ContractModel.find(filters).lean();
  }
}
