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
        schema: [
          new dynamoose.Schema({
            anonymous: Boolean,
            inputs: {
              type: Array,
              schema: [
                new dynamoose.Schema({
                  indexed: Boolean,
                  internalType: String,
                  name: String,
                  type: String,
                  parent: dynamoose.THIS,
                }),
              ],
            },
            name: String,
            type: String,
            parent: dynamoose.THIS,
          }),
        ],
      },
      blockNumber: {
        type: Number,
        required: false,
      },
      options: {
        type: Array,
        required: false,
      },
    },
    { timestamps: true },
  ),
);
