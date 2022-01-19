import { BroadcastSQS } from './sqs';
import { BroadcastConfig } from './interface';

export function createBroadcastInstance(config: BroadcastConfig) {
  const types = {
    sqs: BroadcastSQS,
  };

  const BroadcastClass = types[config.type];
  if (!BroadcastClass) {
    throw new Error("invalid broadcast type.");
  }

  return new BroadcastClass(config);
}
