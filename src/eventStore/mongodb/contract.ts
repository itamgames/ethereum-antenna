import { getModelForClass, index, modelOptions, prop, Severity } from '@typegoose/typegoose';
import { AbiItem } from '../interface';

class ContractEvent {
  @prop()
  format: string;

  @prop()
  abi!: AbiItem;

  @prop({ required: true })
  trackedBlock: number;
}

@index({ address: 1, "events.abi.name": 1 }, { unique: true })
@modelOptions({ options: { allowMixed: Severity.ALLOW }, schemaOptions: { timestamps: true, collection: 'Contract' } })
export class Contract {
  @prop({ required: true })
  address: string;

  @prop({ required: true, _id: false })
  events: ContractEvent[];

  @prop({ required: false })
  options: Record<string, unknown>;
}

export const ContractModel = getModelForClass(Contract);
