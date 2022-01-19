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
}

export interface Contract {
  address: string;
  events: ContractEvent[];
  trackedBlock: number;
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
  addEvent({ address, abi, trackedBlock, options }: Event): Promise<void>;
  updateBlock(address: string, blockNumber: number): Promise<void>;
  updateEvent({ address, abi, trackedBlock, options }: Partial<Event>): Promise<void>;
  removeEvent(address: string): Promise<void>;
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
