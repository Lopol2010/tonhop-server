import { getModelForClass, modelOptions, prop, ReturnModelType } from '@typegoose/typegoose';

@modelOptions({ schemaOptions: { collection: 'last_fetched_ton_transaction' } })
class LastFetchedTONTransaction {
  @prop({ required: true })
  public lt!: string;

  @prop({ required: true })
  public hash!: string;

  public static async get(this: ReturnModelType<typeof LastFetchedTONTransaction>) {
    const result = await LastFetchedTONTransactionModel.findOne();
    return result;
  }

  public static async update(
    this: ReturnModelType<typeof LastFetchedTONTransaction>, 
    transactionId: { lt: string, hash: string }
  ) {
    const result = await LastFetchedTONTransactionModel.findOneAndUpdate(
      { },
      { $set: { ...transactionId } },
      { new: true, upsert: true }
    );
  }
}

export const LastFetchedTONTransactionModel = getModelForClass(LastFetchedTONTransaction);
