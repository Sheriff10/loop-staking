import { ethers } from "hardhat";
import { expect } from "chai";
import logger from "../util/logger";

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

    const ownerBalance = await stakingToken.balanceOf(owner.address);

    logger("Funding contract...");
    await stakingToken
      .connect(owner)
      .approve(rushStaking.target, ownerBalance / 2n);
    expect(await rushStaking.connect(owner).fundPoolReward(ownerBalance / 2n))
      .to.emit(rushStaking, "Funded")
      .withArgs(owner.address, ownerBalance / 2n);
  });

  it("Should Allow user Stake", async () => {
    const lockPeriod = oneDay * 7; // 7 days lock period
    const tokenAmount = ethers.parseEther("4");
    const ownerBalance = await stakingToken.balanceOf(owner.address);
    const ETHbalance = await ethers.provider.getBalance(owner.address);

    // Approve the staking contract to spend tokens
    logger("Approving token...");
    await stakingToken.connect(owner).approve(rushStaking.target, tokenAmount);

    logger("Staking tokens...");
    expect(await rushStaking.connect(owner).stake(lockPeriod, tokenAmount))
      .to.emit(rushStaking, "Staked")
      .withArgs(owner.address, tokenAmount, lockPeriod);

    const userStake = await rushStaking.connect(owner).userStakes(owner);

    expect(
      userStake[0],
      `Stake token is ${userStake[0]} instead of ${tokenAmount}`
    ).to.be.equal(tokenAmount);

    const expectedBalance = ownerBalance - tokenAmount;
    const newBalance = await stakingToken.balanceOf(owner.address);

    logger("Cheking Eth balance change...");
    const NewETHbalance = await ethers.provider.getBalance(owner.address);

    expect(NewETHbalance).to.be.lessThan(ETHbalance);

    expect(newBalance).to.be.equal(expectedBalance as any);
  });

  it("Should allow user to withdraw after lock expires", async () => {
    logger("", { newLine: true });
    const lockPeriod = oneDay * 7; // 7 days lock period
    const tokenAmount = ethers.parseEther("1") / 5n; // 1 token as BigNumber

    // Approve the staking contract to spend the user's tokens
    await stakingToken
      .connect(owner)
      .approve(rushStaking.target, tokenAmount * 2n);

    // Stake tokens
    await rushStaking.connect(owner).stake(lockPeriod, tokenAmount);

    const userStake = await rushStaking.connect(owner).userStakes(owner);

    const beforeBalance = await stakingToken.balanceOf(owner.address);
    logger(`Before Balance: ${beforeBalance}`, { debug: true });

    // Move forward in time by 7 days
    await ethers.provider.send("evm_increaseTime", [lockPeriod]);
    await ethers.provider.send("evm_mine", []);

    // Withdraw tokens
    await expect(rushStaking.connect(owner).withdraw())
      .to.emit(rushStaking, "Withdrawn")
      .withArgs(owner.address, tokenAmount);

    const afterBalance = await stakingToken.balanceOf(owner.address);
    expect(afterBalance).to.be.greaterThan(beforeBalance);
  });

  it.only("Should distrubute rewards...", async () => {
    logger("", { newLine: true });
    const lockPeriod = oneDay * 7; // 7 days lock period
    const tokenAmount = ethers.parseEther("4");
    const ownerBalance = await stakingToken.balanceOf(owner.address);

    logger("Approving token...");
    await stakingToken.connect(owner).approve(rushStaking.target, tokenAmount);

    logger(`Staking ${tokenAmount} tokens...`);
    expect(await rushStaking.connect(owner).stake(lockPeriod, tokenAmount))
      .to.emit(rushStaking, "Staked")
      .withArgs(owner.address, tokenAmount, lockPeriod);

    logger("Checking initial block timestamp...");
    const initialBlock = await ethers.provider.getBlock("latest");
    logger(`Initial block timestamp: ${initialBlock?.timestamp}`, {
      debug: true,
    });

    logger("Moving the day by 1 day...");
    await ethers.provider.send("evm_increaseTime", [oneDay * 2]);
    await ethers.provider.send("evm_mine", []);

    const bfTotalReward = await rushStaking.totalReward();
    logger(`Total reward before: ${bfTotalReward}`, { debug: true });

    await rushStaking.connect(owner).distributeReward(owner.address);
    const userStake = await rushStaking.userStakes(owner.address);
    const afTotalReward = await rushStaking.totalReward();
    logger(`Total reward after: ${afTotalReward}`, { debug: true });

    expect(afTotalReward).to.be.greaterThan(bfTotalReward);
    expect(userStake[1]).to.be.equal(Number(afTotalReward));
  });

  it("Should distrubute rewards once a day...", async () => {
    logger("", { newLine: true });
    const lockPeriod = oneDay * 7; // 7 days lock period
    const tokenAmount = ethers.parseEther("4");
    const ownerBalance = await stakingToken.balanceOf(owner.address);

    logger("Approving token...");
    await stakingToken.connect(owner).approve(rushStaking.target, tokenAmount);

    logger(`Staking ${tokenAmount} tokens...`);
    expect(await rushStaking.connect(owner).stake(lockPeriod, tokenAmount))
      .to.emit(rushStaking, "Staked")
      .withArgs(owner.address, tokenAmount, lockPeriod);

    await expect(
      rushStaking.connect(owner).distributeReward(owner.address)
    ).to.be.revertedWith("Rewards can only be distributed once a day");
  });

  it("Should claim tokens reward", async () => {
    logger("", { newLine: true });
    const lockPeriod = oneDay * 7; // 7 days lock period
    const tokenAmount = ethers.parseEther("4");
    const ETHbalance = await ethers.provider.getBalance(owner.address);
    logger(ETHbalance, { debug: true });

    logger("Approving token...");
    await stakingToken.connect(owner).approve(rushStaking.target, tokenAmount);

    logger(`Staking ${tokenAmount} tokens...`);
    expect(
      await rushStaking
        .connect(owner)
        .stake(lockPeriod, tokenAmount, { value: ethers.parseEther("1") })
    )
      .to.emit(rushStaking, "Staked")
      .withArgs(owner.address, tokenAmount, lockPeriod);

    logger("Moving the day by 1 day...");
    await ethers.provider.send("evm_increaseTime", [oneDay * 2]);
    await ethers.provider.send("evm_mine", []);

    logger("Distributing rewards...");
    await rushStaking.connect(owner).distributeReward(owner.address);
    logger("Distributing rewards done...");

    const ownerBalance = await stakingToken.balanceOf(owner.address);

    await rushStaking.connect(owner).claimRewards();

    const totalReward = await rushStaking.totalReward();
    const newOwnerBalance = await stakingToken.balanceOf(owner.address);

    logger({ newOwnerBalance, ownerBalance, totalReward }, { debug: true });

    expect(totalReward).to.be.greaterThan(0);
    expect(newOwnerBalance).to.be.equal(ownerBalance + totalReward);
  });
});
