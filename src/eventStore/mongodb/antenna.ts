import {
  getModelForClass,
  index,
  modelOptions,
  prop,
  Severity,
} from '@typegoose/typegoose';
import { AbiItem } from '../interface';

@index(
  { contractAddress: 1 },
  { collation: { locale: 'en', strength: 2 }, unique: true },
)
@modelOptions({
  options: { allowMixed: Severity.ALLOW },
  schemaOptions: { timestamps: true, collection: 'Antenna' },
})
export class AntennaSchema {
  @prop({ required: true })
  contractAddress: string;

  @prop({ required: true, _id: false })
  abi: AbiItem[];

  @prop({ required: false })
  blockNumber: number;

  @prop({ required: false })
  options: Record<string, unknown>;
}

export const Antenna = getModelForClass(AntennaSchema);
