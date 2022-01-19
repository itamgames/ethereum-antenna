import { EventStoreConfig } from './interface';
import { EventStoreMongoDB } from './mongodb';

export function createEventStoreInstance(config: EventStoreConfig) {
  const types = {
    mongodb: EventStoreMongoDB,
  };

  const EventStoreClass = types[config.type];
  if (!EventStoreClass) {
    throw new Error("invalid event store type.");
  }

  return new EventStoreClass(config);
}
