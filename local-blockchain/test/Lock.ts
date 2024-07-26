import {
  time,
  loadFixture,
  mine,
} from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { getAddress, http, parseGwei, parseUnits, publicActions, walletActions } from "viem";
import { hardhat } from "viem/chains";
import watchBridge from "../../src/BNBWatcher";

// temp fix: https://github.com/NomicFoundation/edr/issues/447#issuecomment-2125163333
mine()

describe("listener", function () {
  
  const BNB_BRIDGE_ADDRESS = "0xD50346F70F16B3a9Bd2770731Fc25A0a2230d594";
  const BNB_TONCOIN_ADDRESS = "0x76A797A59Ba2C17726896976B7B3747BfD1d220f";
  const BNB_TONCOIN_HOLDER = "0x5345ae488B9AdeA607175956F7d41f0871116cc7";

  
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployOneYearLockFixture() {
    let listener = watchBridge();
    let toncoin = await hre.viem.getContractAt("IERC20", BNB_TONCOIN_ADDRESS);
    let toncoinHolder = (await hre.viem.getTestClient({
      // mode: "hardhat",
      // chain: hardhat,
      // transport: http()
    }))
      .extend(publicActions)
      .extend(walletActions);
    await toncoinHolder.impersonateAccount({
      address: BNB_TONCOIN_HOLDER
    });
    let holder = toncoinHolder.account;
    // console.log(await toncoinHolder.getAddresses())


    console.log(await toncoin.read.balanceOf([BNB_TONCOIN_HOLDER]))
    let tx = await toncoin.write.transfer(
      [BNB_BRIDGE_ADDRESS, parseUnits("1", 9)],
      {
        account: BNB_TONCOIN_HOLDER
      }
    )
    console.log(tx)
    console.log(await toncoin.read.balanceOf([BNB_BRIDGE_ADDRESS]))
    
    // const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;

    // const lockedAmount = parseGwei("1");
    // const unlockTime = BigInt((await time.latest()) + ONE_YEAR_IN_SECS);

    // // Contracts are deployed using the first signer/account by default
    // const [owner, otherAccount] = await hre.viem.getWalletClients();

    // const lock = await hre.viem.deployContract("Lock", [unlockTime], {
    //   value: lockedAmount,
    // });

    // const publicClient = await hre.viem.getPublicClient();

    // return {
    //   lock,
    //   unlockTime,
    //   lockedAmount,
    //   owner,
    //   otherAccount,
    //   publicClient,
    // };
  }

  describe("", function () {
    it("", async function () {
      const a = await loadFixture(deployOneYearLockFixture);

      // expect(await lock.read.unlockTime()).to.equal(unlockTime);
    });
  });
});
