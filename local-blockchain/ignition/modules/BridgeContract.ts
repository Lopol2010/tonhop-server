import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseEther } from "viem";

const BridgeContractModule = buildModule("BridgeContractModule", (m) => {

  const bridge = m.contract("BridgeContract", [], {});

  return { bridge };
});

export default BridgeContractModule;
