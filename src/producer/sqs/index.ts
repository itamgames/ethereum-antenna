import { SQSClient, SendMessageBatchCommand } from '@aws-sdk/client-sqs';
import { IProducer, BroadcastConfig, QueueMessage } from '../interface';
import { arrayChunk } from '../../utils';

export class BroadcastSQS implements IProducer {
  config: BroadcastConfig;
  sqs: SQSClient;

  constructor(config: BroadcastConfig) {
    this.config = config;
  }

  async connect() {
    // pass
    this.sqs = new SQSClient({
      region: this.config.region,
    });
  }

  async broadcast(msgs: QueueMessage[], chunkSize: number = 10) {
    if (!this.sqs) {
      await this.connect();
    }

    const chunkedMsgs = arrayChunk(msgs, chunkSize);

    for (const chunk of chunkedMsgs) {
      try {
        const command = new SendMessageBatchCommand({
          QueueUrl: this.config.queueUrl,
          Entries: chunk.map((message) => ({
            Id: message.id,
            MessageGroupId: this.config.fifo ? message.id : undefined,
            MessageBody: JSON.stringify({
              id: message.id,
              transactionHash: message.transactionHash,
              logIndex: message.logIndex,
              contractAddress: message.contractAddress,
              event: message.event,
              params: message.params,
              options: message.options,
              blockNumber: message.blockNumber,
              blockCreatedAt: message.blockCreatedAt,
            }),
          })),
        });
        await this.sqs.send(command);
      } catch (error: any) {
        console.error('SQS send message error: ', error);
        const { requestId, cfId, extendedRequestId } = error.$metadata;
        console.log({ requestId, cfId, extendedRequestId });
      }
    }
  }
}
