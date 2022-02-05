import { ConnectOptions } from 'mongoose';

type MongoConfig = {
  type: 'mongodb';
  uri: string;
  connectionOptions?: ConnectOptions;
};

export type EventStoreConfig = MongoConfig;

export interface Contract {
  contractAddress: string;
  abi: AbiItem[];
  blockNumber?: number;
  options?: Record<string, unknown>;
}

export interface IEventStore {
  connect(): Promise<void>;
  addEvent(contractAddress: string, abi: AbiItem): Promise<void>;
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
