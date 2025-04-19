import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const RushTokenModule = buildModule("RushTokenModule", (m) => {
  const initialSupply = m.getParameter<number>("initialSupply", 200000000); // Set default initial supply to 1 million

  // Deploy the RushToken contract
  const rushToken = m.contract("RushToken");

  return { rushToken };
});

export default RushTokenModule;
