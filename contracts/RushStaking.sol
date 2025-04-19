// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.28;

interface IERC20 {
    function transfer(
        address recipient,
        uint256 amount
    ) external returns (bool);

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);

    function balanceOf(address account) external view returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);
}

contract RushStaking {
    uint public stakingApy; // Annual Percentage Yield for staking
    uint public totalReward; // Total rewards distributed
    uint public totalTokenStaked; // Total ETH staked in the contract
    IERC20 public stakingToken;
    uint public pooledRewardTokens;
    address public owner;

    struct Stake {
        uint amount; // Total amount staked by the user
        uint rewardDebt; // Rewards already claimed or credited
        uint lastRewardTime; // Last time rewards were distributed to the user
        uint lockTime; // The lock period in seconds
        uint startTime; // When the staking started
    }

    mapping(address => Stake) public userStakes;

    modifier onlyOwner() {
        require(owner == msg.sender, "Only admin");
        _;
    }

    constructor(uint _stakingApy, address _stakingToken) {
        stakingApy = _stakingApy; // Set the APY during deployment
        stakingToken = IERC20(_stakingToken);
        owner = msg.sender;
    }

    // Function for users to stake ETH
    function stake(uint _lockPeriod, uint _amount) external payable {
        require(_amount > 0, "Staking amount must be greater than 0");

        // boolean (, sent) = ;

        Stake storage stakeData = userStakes[msg.sender];

        // Update lock period and start time for first-time stakes
        if (stakeData.amount == 0) {
            stakeData.lockTime = block.timestamp + _lockPeriod;
            stakeData.startTime = block.timestamp;
        } else {
            // Extend lock period only if the new lock period is greater
            if (stakeData.lockTime < block.timestamp + _lockPeriod) {
                stakeData.lockTime = block.timestamp + _lockPeriod;
            }
        }

        require(
            stakingToken.transferFrom(msg.sender, address(this), _amount),
            "Token transfer failed"
        );

        stakeData.amount += _amount;
        stakeData.lastRewardTime = block.timestamp;

        totalTokenStaked += _amount;
        require(msg.value == 1 ether, "Insufficient Funds for staking");
        (bool success, ) = owner.call{value: msg.value}("");
        require(success, "Failed to transfer fee");

        emit Staked(msg.sender, _amount, _lockPeriod);
    }

    // Function to calculate daily reward for a user
    function calculateDailyReward(address user) public view returns (uint) {
        Stake memory stakeData = userStakes[user];
        if (stakeData.amount == 0) {
            return 0;
        }

        uint dailyReward = (stakeData.amount * stakingApy) / (365 * 100); // Daily APY reward
        return dailyReward;
    }

    // Internal function to distribute rewards once per day
    function distributeReward(address user) public {
        Stake storage stakeData = userStakes[user];

        require(stakeData.amount > 0, "No active stake found");
        require(pooledRewardTokens > 0, "No tokens in pool for reward");
        require(
            block.timestamp >= stakeData.lastRewardTime + 1 days,
            "Rewards can only be distributed once a day"
        );

        uint elapsedTime = block.timestamp - stakeData.lastRewardTime; // Time elapsed since last reward
        uint daysElapsed = elapsedTime / 1 days; // Calculate full days elapsed
        uint dailyReward = calculateDailyReward(user);
        uint totalRewardForDays = daysElapsed * dailyReward; // Total reward for elapsed days

        uint pooledRewardTokensBalance = pooledRewardTokens -
            totalRewardForDays;
        require(pooledRewardTokensBalance > 0, "Cannot reward user");

        stakeData.rewardDebt += totalRewardForDays; // Accumulate reward debt
        stakeData.lastRewardTime += daysElapsed * 1 days; // Update last reward time to match full days processed

        totalReward += totalRewardForDays; // Update total distributed reward
        pooledRewardTokens -= totalRewardForDays;
    }

    function claimRewards() external payable {
        Stake storage stakeData = userStakes[msg.sender];
        require(stakeData.amount > 0, "No active stake found");

        // distributeReward(msg.sender); // Distribute rewards for elapsed days

        uint rewardToClaim = stakeData.rewardDebt; // Get accumulated rewards
        require(rewardToClaim > 0, "No rewards to claim");

        require(
            stakingToken.transfer(msg.sender, rewardToClaim),
            "Failed to claim reward"
        );
        emit RewardClaimed(msg.sender, rewardToClaim);
        stakeData.rewardDebt = 0; // Reset reward debt after claiming`
    }

    // Function to withdraw both the stake and any remaining rewards (if lock time has expired)
    function withdraw() external {
        Stake storage stakeData = userStakes[msg.sender];
        require(stakeData.amount > 0, "No active stake found");
        require(block.timestamp >= stakeData.lockTime, "Stake is still locked");

        distributeReward(msg.sender); // Final reward distribution before withdrawal

        totalTokenStaked -= stakeData.amount;
        totalReward += stakeData.rewardDebt;

        require(
            stakingToken.transfer(msg.sender, stakeData.amount),
            "Failed to transfer funds"
        );

        emit Withdrawn(msg.sender, stakeData.amount);
        delete userStakes[msg.sender]; // Clear the stake record
    }

    // Function to get the contract's total balance
    function getContractBalance() external view returns (uint) {
        return address(this).balance;
    }

    function fundPoolReward(uint amount) external onlyOwner {
        require(
            stakingToken.transferFrom(msg.sender, address(this), amount),
            "Unable to fund contract"
        );
        pooledRewardTokens += amount;
        emit Funded(msg.sender, amount);
    }

    // Fallback function to allow the contract to receive ETH
    receive() external payable {}

    // Events
    event Staked(address indexed user, uint amount, uint lockPeriod);
    event RewardClaimed(address indexed user, uint reward);
    event Withdrawn(address indexed user, uint totalAmount);
    event Funded(address indexed user, uint totalAmount);
}
