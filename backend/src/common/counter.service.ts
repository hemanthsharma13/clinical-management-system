import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Counter } from './counter.schema';

@Injectable()
export class CounterService {
  constructor(@InjectModel(Counter.name) private readonly counters: Model<Counter>) {}

  async next(key: string): Promise<number> {
    const document = await this.counters.findOneAndUpdate(
      { key },
      { $inc: { seq: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return document.seq;
  }
}
