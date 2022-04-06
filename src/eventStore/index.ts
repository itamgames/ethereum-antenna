import { ConnectOptions } from 'mongoose';
import { EventStoreDynamoDB } from './dynamodb';
import { EventStoreConfig, EventStoreType } from './interface';
import { EventStoreMongoDB } from './mongodb';

export function createEventStoreInstance(
  config: EventStoreConfig['mongodb'] | EventStoreConfig['dynamodb'],
) {
  const types = {
    mongodb: EventStoreMongoDB,
    dynamodb: EventStoreDynamoDB,
  };

  const EventStoreClass = types[config.type];
  if (!EventStoreClass) {
    throw new Error('invalid event store type.');
  }

  // @ts-ignore
  return new EventStoreClass(config);
}
