import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const RushStakingModule = buildModule("RushStakingModule", (m) => {
  // Define deployment parameters
  const stakingApy = m.getParameter<number>("stakingApy", 10); // Set default APY to 10%
  const stakingToken = m.getParameter<string>(
    "stakingToken",
    "0xf54fCdbF63D61781cC57E8536F505236Fa6960fA"
  );

  // Deploy the RushStaking contract
  const rushStaking = m.contract("RushStaking", [stakingApy, stakingToken]);

  return { rushStaking };
});

export default RushStakingModule;
