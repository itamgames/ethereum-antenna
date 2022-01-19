import { config as AWSConfig, SQS } from 'aws-sdk';
import { IProducer, BroadcastConfig, QueueMessage } from '../interface';
import https from 'https';
import { arrayChunk } from '../../utils';

AWSConfig.update({
  region: 'ap-northeast-2',
});

export class BroadcastSQS implements IProducer {
  config: BroadcastConfig;
  sqs: SQS;

  constructor(config: BroadcastConfig) {
    this.config = config;
    
    AWSConfig.update({
      region: config?.region, accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey,
    });
  }

  async connect() {
    // pass
    this.sqs = new SQS({
      apiVersion: '2012-11-05',
      httpOptions: {
        agent: new https.Agent({
          keepAlive: true
        }),
      }
    });
  }

  async broadcast(msgs: QueueMessage[], chunkSize: number = 10) {
    if (!this.sqs) {
      await this.connect();
    }

    const chunkedMsgs = arrayChunk(msgs, chunkSize);

    for (const chunk of chunkedMsgs) {
      await this.sqs.sendMessageBatch({
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
            blockNumber: message.blockNumber,
            blockCreatedAt: message.blockCreatedAt,
          }),
        }))
      })
      .promise()
      .catch((err) => {
        console.log(err?.code);
        console.error('SQS send message error: ', err);
      });
    }
  }
}
