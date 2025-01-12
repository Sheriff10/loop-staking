import { ethers } from "hardhat";
import { expect } from "chai";

describe("LoopStaking", function () {
  let LoopStaking: any;
  let loopStaking: any;
  let owner: any, user1: any, user2: any;

  const stakingApy = 10; // 10% APY
  const oneEth = ethers.parseEther("1"); // 1 ETH as BigNumber
  const oneDay = 24 * 60 * 60; // 1 day in seconds

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy the contract
    LoopStaking = await ethers.getContractFactory("LoopStaking");
    loopStaking = await LoopStaking.deploy(stakingApy);
    await loopStaking.waitForDeployment();
  });

  it("Should allow a user to stake ETH", async function () {
    const lockPeriod = oneDay * 7; // 7 days lock period

    await expect(
      loopStaking.connect(user1).stake(lockPeriod, { value: oneEth })
    )
      .to.emit(loopStaking, "Staked")
      .withArgs(user1.address, oneEth, lockPeriod);

    const userStake = await loopStaking.userStakes(user1.address);
    expect(userStake.amount).to.equal(oneEth);
    expect(userStake.lockTime).to.be.above(0);
  });

  it("Should calculate daily rewards correctly", async function () {
    const lockPeriod = oneDay * 7;
    await loopStaking.connect(user1).stake(lockPeriod, { value: oneEth });

    // Move forward in time by one day
    await ethers.provider.send("evm_increaseTime", [oneDay]);
    await ethers.provider.send("evm_mine", []);

    const dailyReward = await loopStaking.calculateDailyReward(user1.address);

    const expectedReward = (oneEth * BigInt(stakingApy)) / BigInt(365 * 100); // 10% APY divided by 365 days
    expect(dailyReward).to.equal(expectedReward);
  });

  it("Should distribute rewards daily", async function () {
    const lockPeriod = oneDay * 7;
    await loopStaking.connect(user1).stake(lockPeriod, { value: oneEth });

    // Move forward in time by one day
    await ethers.provider.send("evm_increaseTime", [oneDay]);
    await ethers.provider.send("evm_mine", []);

    const rewardToClaim = await loopStaking.calculateDailyReward(user1.address);
    await expect(loopStaking.connect(user1).claimRewards())
      .to.emit(loopStaking, "RewardClaimed")
      .withArgs(user1.address, rewardToClaim);

    const userStake = await loopStaking.userStakes(user1.address);
    expect(userStake.rewardDebt).to.be.equal(0, "user claimed reward");
  });

  it("Should allow user to withdraw after lock period", async function () {
    const lockPeriod = oneDay * 7;

    // Fund the contract with 10 ETH
    await owner.sendTransaction({
      to: loopStaking.target, // Contract address
      value: ethers.parseEther("10"), // Fund the contract
    });

    // User stakes 1 ETH
    await loopStaking.connect(user1).stake(lockPeriod, { value: oneEth });

    // Move forward in time by 7 days
    await ethers.provider.send("evm_increaseTime", [lockPeriod]);
    await ethers.provider.send("evm_mine", []);

    // User withdraws their stake
    await expect(loopStaking.connect(user1).withdraw())
      .to.emit(loopStaking, "Withdrawn")
      .withArgs(user1.address, oneEth);

    // Ensure user's stake is removed
    const updatedUserStake = await loopStaking.userStakes(user1.address);
    expect(updatedUserStake.amount).to.equal(0);
  });

  it("Should prevent rewards claim before 24 hours", async function () {
    const lockPeriod = oneDay * 7;
    await loopStaking.connect(user1).stake(lockPeriod, { value: oneEth });

    await expect(loopStaking.connect(user1).claimRewards()).to.be.revertedWith(
      "Rewards can only be distributed once a day"
    );
  });

  it("Should not allow withdrawal before lock period", async function () {
    const lockPeriod = oneDay * 7;
    await loopStaking.connect(user1).stake(lockPeriod, { value: oneEth });

    await expect(loopStaking.connect(user1).withdraw()).to.be.revertedWith(
      "Stake is still locked"
    );
  });
});
