import * as dynamoose from 'dynamoose';
import { Document } from 'dynamoose/dist/Document';
import { AbiItem } from '../interface';

class Antenna extends Document {
  contractAddress: string;
  abi: AbiItem[];
  blockNumber: number;
  options: Record<string, unknown>;
}

export const AntennaModel = dynamoose.model<Antenna>(
  'Antenna',
  new dynamoose.Schema(
    {
      contractAddress: {
        type: String,
      },
      abi: {
        type: Array,
      },
      blockNumber: {
        type: Number,
      },
      options: {
        type: Array,
      },
    },
    { timestamps: true },
  ),
);
