import { ConnectOptions } from 'mongoose';

type DBConfig = {
  mongodb: {
    type: 'mongodb';
    uri: string;
    connectionOptions?: ConnectOptions;
    network?: string;
  };
  dynamodb: {
    type: 'dynamodb';
    accessKeyId?: string;
    secretAccessKey?: string;
    region: string;
    network?: string;
  };
};

export type EventStoreConfig = DBConfig;
export type EventStoreType = keyof DBConfig;

export interface Contract {
  contractAddress: string;
  abi: AbiItem[];
  blockNumber?: number;
  options?: Record<string, unknown>;
}

export interface IEventStore {
  connect(): Promise<void>;
  addEvent(
    contractAddress: string,
    abi: AbiItem[],
    {
      blockNumber,
      options,
    }: { blockNumber?: number; options?: Record<string, unknown> },
  ): Promise<void>;
  updateEvent(
    contractAddress: string,
    abi: AbiItem[],
    {
      blockNumber,
      options,
    }: { blockNumber?: number; options?: Record<string, unknown> },
  ): Promise<void>;
  removeEvent(contractAddress: string, eventName: string): Promise<void>;
  updateBlock(contractAddress: string, blockNumber: number): Promise<void>;
  getContract(contractAddress: string): Promise<Contract>;
  getContracts(): Promise<Contract[]>;
}

export interface AbiItem {
  anonymous?: boolean;
  inputs?: AbiInput[];
  name: string;
  type: AbiType;
}

interface AbiInput {
  name: string;
  type: string;
  indexed?: boolean;
  internalType?: string;
}

type AbiType = 'function' | 'constructor' | 'event' | 'fallback';
