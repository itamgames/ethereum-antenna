import * as dynamoose from 'dynamoose';
import { AbiItem, Contract, EventStoreConfig, IEventStore } from '../interface';
import { AntennaModel, DynamoAntennaProperty } from './antenna';

export class EventStoreDynamoDB implements IEventStore {
  config: EventStoreConfig['dynamodb'];

  constructor(config: EventStoreConfig['dynamodb']) {
    this.config = config;
  }

  async connect(): Promise<void> {
    const config: Partial<EventStoreConfig['dynamodb']> = {
      region: this.config.region,
    };

    this.config.secretAccessKey &&
      (config.secretAccessKey = this.config.secretAccessKey);
    this.config.accessKeyId && (config.accessKeyId = this.config.accessKeyId);

    dynamoose.aws.sdk.config.update(config);
  }

  async addEvent(
    contractAddress: string,
    abi: AbiItem[],
    {
      blockNumber,
      options,
    }: { blockNumber?: number; options?: Record<string, unknown> } = {},
  ): Promise<void> {
    let contract = await AntennaModel(this.config.network).get({
      contractAddress,
    });
    if (!contract) {
      contract = await AntennaModel(this.config.network).create({
        contractAddress,
      });
    }

    const arr = contract.abi || [];
    arr.push(...abi);
    contract.abi = arr;
    if (blockNumber) {
      contract.blockNumber = blockNumber;
    }
    if (options) {
      contract.options = options;
    }
    await contract.save();
  }

  async updateEvent(
    contractAddress: string,
    abi: AbiItem[],
    {
      blockNumber,
      options,
    }: { blockNumber?: number; options?: Record<string, unknown> } = {},
  ): Promise<void> {
    let contract = await AntennaModel(this.config.network).get({
      contractAddress,
    });
    if (!contract) {
      contract = await AntennaModel(this.config.network).create({
        contractAddress,
      });
    }

    contract.abi = abi;
    if (blockNumber) {
      contract.blockNumber = blockNumber;
    }
    if (options) {
      contract.options = options;
    }
    await contract.save();
  }

  async removeEvent(contractAddress: string, eventName: string): Promise<void> {
    const contract = await AntennaModel(this.config.network).get({
      contractAddress,
    });
    if (!contract) {
      throw Error('invalid contract address');
    }

    const event = contract.abi.find((event) => event.name === eventName);
    if (!event) {
      throw Error('invalid event name');
    }
    contract.abi = contract.abi.splice(contract.abi.indexOf(event), 1);
    if (contract.abi.length === 0) {
      await contract.delete();
    } else {
      await contract.save();
    }
  }

  async updateBlock(
    contractAddress: string,
    blockNumber: number,
  ): Promise<void> {
    await AntennaModel(this.config.network).update({ contractAddress }, { blockNumber });
  }

  async getContract(contractAddress: string): Promise<Contract> {
    const contract = await AntennaModel(this.config.network).get({
      contractAddress,
    });
    if (!contract) {
      throw Error('invalid contract address');
    }
    return {
      contractAddress: contract.contractAddress,
      abi: contract.abi,
      blockNumber: contract.blockNumber,
      options: contract.options,
    };
  }

  async getContracts(): Promise<Contract[]> {
    const contracts: DynamoAntennaProperty[] = await AntennaModel(this.config.network).scan()
      .all()
      .exec();

    return contracts.map((contract) => ({
      contractAddress: contract.contractAddress,
      abi: contract.abi,
      blockNumber: contract.blockNumber,
      options: contract.options,
    }));
  }
}
