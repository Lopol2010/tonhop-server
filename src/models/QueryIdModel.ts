import { HighloadQueryId } from '../HighloadWalletV3/HighloadQueryId';
import mongoose from 'mongoose';

interface Counter {
  _id: string;
  value: string;
}

export const getLastQueryId = async () => {
  const result = await mongoose.connection.collection<Counter>('counters').findOneAndUpdate(
    { _id: "transferCounter" },
    { $setOnInsert: { value: "2000"} },
    { upsert: true, returnDocument: 'after' }
  );

  if(!result) throw new Error("Unable to store QueryId in DB!");

  return HighloadQueryId.fromSeqno(BigInt(result.value));
}

export const getNextQueryId = async (currentQueryId: HighloadQueryId) => {
  let nextQueryId = currentQueryId.hasNext() ? currentQueryId.getNext() : new HighloadQueryId();

  const result = await mongoose.connection.collection<Counter>('counters').findOneAndUpdate(
    { _id: "transferCounter" },
    { $set: { value: nextQueryId.toSeqno().toString() } },
    { returnDocument: 'after' }
  );

  if(!result) throw new Error("Unable to store QueryId in DB!");

  return HighloadQueryId.fromSeqno(BigInt(result.value));
};;