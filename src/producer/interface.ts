type SQSConfig = {
  type: 'sqs';
  fifo?: boolean;
  queueUrl: string;
  region?: string;
  batchSize?: number;
};

export type BroadcastConfig = SQSConfig;

export type QueueMessage = {
  id: string;
  transactionHash: string;
  logIndex: number;
  contractAddress: string;
  event: string;
  params?: Record<string, string | number>;
  options?: Record<string, unknown>;
  blockNumber: number;
  blockCreatedAt: Date;
}

export interface IProducer {
  connect(): Promise<void>;
  broadcast(msgs: QueueMessage[], chunkSize?: number): Promise<void>;
}
