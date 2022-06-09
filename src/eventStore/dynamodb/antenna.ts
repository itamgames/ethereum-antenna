import * as dynamoose from 'dynamoose';
import { Document } from 'dynamoose/dist/Document';
import { AbiItem } from '../interface';

export interface DynamoAntennaProperty {
  contractAddress: string;
  abi: AbiItem[];
  blockNumber: number;
  options: Record<string, unknown>;
}

class Antenna extends Document implements DynamoAntennaProperty {
  contractAddress: string;
  abi: AbiItem[];
  blockNumber: number;
  options: Record<string, unknown>;
}

export const AntennaModel = (network?: string) => dynamoose.model<Antenna>(
  `${network ? `${network}-` : ''}Antenna`,
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
        type: Object,
        required: false,
      },
    },
    { timestamps: true },
  ),
  { create: false, waitForActive: false },
);
