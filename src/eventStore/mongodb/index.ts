import { connect } from 'mongoose';
import { IEventStore, EventStoreConfig, Event } from '../interface';
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

  async addContract({ address, abi, trackedBlock, options }: Event) {
    const event = await ContractModel.findOne({ address });
    if (event) {
      throw Error(`Event ${address} already exists`);
    }
    const contract = new ContractModel({ address, options });
    if (Array.isArray(abi)) {
      const eventNames = abi.map(item => item.name);
      const parameters = abi.map(item => item.inputs?.map(input => input.type ));
      contract.events = eventNames.map((name, index) => ({ format: `${name}(${parameters[index]?.join(',')})`, abi: abi[index], trackedBlock: trackedBlock ?? 0 }));
    } else {
      contract.events = [{ format: `${abi.name}(${abi.inputs?.map(input => ({ type: input.type, name: input.name }))})`, abi, trackedBlock: trackedBlock ?? 0 }];
    }
    await contract.save();
  }

  async updateContract({ address, abi, trackedBlock, options }: Partial<Event>) {
    const contract = await ContractModel.findOne({ address });
    if (!contract) {
      throw Error(`Event ${address} does not exist`);
    }
    if (Array.isArray(abi)) {
      const eventNames = abi.map(item => item.name);
      const parameters = abi.map(item => item.inputs?.map(input => input.type ));
      contract.events = eventNames.map((name, index) => ({ format: `${name}(${parameters[index]?.join(',')})`, abi: abi[index], trackedBlock: trackedBlock ?? 0 }));
    } else {
      if (abi) {
        contract.events = [{ format: `${abi.name}(${abi.inputs?.map(input => ({ type: input.type, name: input.name }))})`, abi, trackedBlock: trackedBlock ?? 0 }];
      }
    }
    if (options) {
      contract.options = options;
    }
    await contract.save();
  }

  async updateBlock(address: string, eventName: string, blockNumber: number) {
    await ContractModel.findOneAndUpdate({ address, 'events.abi.name': eventName }, { $set: { 'events.$.trackedBlock': blockNumber } });
  }

  async removeContract(eventId: string) {
    await ContractModel.deleteOne({ _id: eventId });
  }

  async getContracts(address?: string) {
    const params = { address };
    const filters = Object.fromEntries(Object.entries(params).filter(([_, v]) => !!v));
    return ContractModel.find(filters).lean();
  }
}
