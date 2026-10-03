import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ collection: 'counters', timestamps: false })
export class Counter {
  @Prop({ required: true, unique: true })
  key!: string;

  @Prop({ required: true, default: 0 })
  seq!: number;
}

export type CounterDocument = HydratedDocument<Counter>;
export const CounterSchema = SchemaFactory.createForClass(Counter);
