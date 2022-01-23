import { ConnectOptions } from 'mongoose';

type MongoConfig = {
  type: 'mongodb';
  uri: string;
  connectionOptions?: ConnectOptions;
};

export type EventStoreConfig = MongoConfig;

interface ContractEvent {
  format: string;
  abi: AbiItem;
  trackedBlock: number;
}

export interface Contract {
  address: string;
  events: ContractEvent[];
  options?: Record<string, unknown>;
}

export interface Event {
  address: string;
  abi: AbiItem[] | AbiItem;
  trackedBlock?: number;
  options?: Record<string, unknown>;
}

export interface IEventStore {
  connect(): Promise<void>;
  addContract({ address, abi, trackedBlock, options }: Event): Promise<void>;
  updateContract({ address, abi, trackedBlock, options }: Partial<Event>): Promise<void>;
  updateBlock(address: string, eventName: string, blockNumber: number): Promise<void>;
  removeContract(address: string): Promise<void>;
  getContracts(address?: string): Promise<Contract[]>;
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
