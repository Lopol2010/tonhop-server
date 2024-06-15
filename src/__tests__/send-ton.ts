
describe('Tests', () => {

  // let snapshotId: `0x${string}`;

  // beforeAll(async () => {
  //   const c = new TonClient({
  //       endpoint: await getHttpEndpoint({
  //         network: 'mainnet'
  //       })
  //     });

  //     // new TonClient4()
  //   // const client = wrapTonClient4ForRemote(c);
  //   const client = wrapTonClient4ForRemote(c);
      
  //   const blockchain = await Blockchain.create({
  //     storage: new RemoteBlockchainStorage(client)
  //   });
  //   const key = await mnemonicToWalletKey(env.MNEMONIC.split(" "));
  //   const wallet = blockchain.openContract(WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 }));

  //   // let deployer = await blockchain.treasury('deployer');
  //   // deployer.

  //   let seqno = await wallet.getSeqno();

  //   let transfers: TransferDetailsArray = [
  //     {
  //       to: 'UQC_pxTeZV0YIxOhOWRyJpuni-ab-68Akldrl6pvhZ3BcgV8',
  //       value: 1000000000n,
  //       logId: '0x0ca090aba162805323b31b005db6952514a9572fc3566dcb376c6f97c7f87a640xa3e42f3662d8e4076bb99dc4459aba10fb99e57b63917a656dad9c9e6b76a76a2'
  //     },
  //     {
  //       to: 'UQC_pxTeZV0YIxOhOWRyJpuni-ab-68Akldrl6pvhZ3BcgV8',
  //       value: 2000000000n,
  //       logId: '0x0ca090aba162805323b31b005db6952514a9572fc3566dcb376c6f97c7f87a640x0fd4b6233be9611ec41f005cb51755e7f4ab0620d548fc6ccf89d75a0d82b42f5'
  //     }
  //   ]

  //   let messages = transfers.map(({ to, value, logId }) => {
  //     return internal({
  //       to: to,
  //       value: value,
  //       bounce: false,
  //       body: logId
  //     })
  //   })
  //   console.log(await wallet.getBalance());
  //   await wallet.sendTransfer({
  //     secretKey: key.secretKey,
  //     seqno: seqno,
  //     messages: messages
  //   });

  //   seqno++;
  // })

  // beforeEach(async () => {
  // })

  // afterEach(async () => {
  // })

  // afterAll(async () => {
  // })

  // it('should ignore bad address', async () => {
  // })

})