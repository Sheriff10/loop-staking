import { ethers } from "hardhat";
import { expect } from "chai";

describe("RushStaking", () => {
  let RushStaking: any;
  let rushStaking: any;
  let owner: any, user1: any, user2: any;
  let stakingToken: any;

  const stakingApy = 10; // 10% APY
  const oneEth = ethers.parseEther("1"); // 1 ETH as BigNumber
  const oneDay = 24 * 60 * 60; // 1 day in seconds

  beforeEach(async () => {
    [owner, user1, user2] = await ethers.getSigners();

    const MockToken = await ethers.getContractFactory("MockERC20");
    stakingToken = await MockToken.deploy(
      "Mock Token",
      "RWD",
      ethers.parseEther("100000")
    );
    await stakingToken.waitForDeployment();

    RushStaking = await ethers.getContractFactory("RushStaking");
    rushStaking = await RushStaking.deploy(stakingApy, stakingToken.target);

    await rushStaking.waitForDeployment();
  });

  it("Should Allow user Stake", async () => {
    const lockPeriod = oneDay * 7; // 7 days lock period
    const tokenAmount = ethers.parseEther("4");

    expect(rushStaking.connect(user1).stake(lockPeriod, { value: tokenAmount }))
      .to.emit(rushStaking, "Staked")
      .withArgs(user1.address, tokenAmount, lockPeriod);
  });

  it("Should allow user to withdraw after lock expires", async () => {
    const lockPeriod = oneDay * 7; // 7 days lock period
    const tokenAmount = ethers.parseEther("1") / 5n; // 1 token as BigNumber

    // Approve the staking contract to spend the user's tokens
    await stakingToken
      .connect(owner)
      .approve(rushStaking.target, tokenAmount * 2n);

    // Stake tokens
    await rushStaking.connect(owner).stake(lockPeriod, tokenAmount);

    const userStake = await rushStaking.connect(owner).userStakes(owner);
    console.log(userStake);

    const beforeBalance = await stakingToken.balanceOf(owner.address);
    console.log({ beforeBalance });

    // Move forward in time by 7 days
    await ethers.provider.send("evm_increaseTime", [lockPeriod]);
    await ethers.provider.send("evm_mine", []);

    // Withdraw tokens
    await expect(rushStaking.connect(owner).withdraw())
      .to.emit(rushStaking, "Withdrawn")
      .withArgs(owner.address, tokenAmount);

    const afterBalance = await stakingToken.balanceOf(owner.address);
    console.log({
      afterBalance: afterBalance.toString(),
      beforeBalance: beforeBalance.toString(),
    });
    expect(afterBalance).to.be.greaterThan(beforeBalance);
  });
});
