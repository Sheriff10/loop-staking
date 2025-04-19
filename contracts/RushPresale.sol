// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

interface IERC20 {
    function transfer(
        address recipient,
        uint256 amount
    ) external returns (bool);

    function balanceOf(address account) external view returns (uint256);

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);
}

contract RushPresale {
    address public owner;
    IERC20 public token;
    uint public tokenRatePerEth;
    uint public tokensSold;

    uint public minPurchase;
    uint public maxPurchase;

    mapping(address => uint) public userPurchases;

    // Modifier to restrict functions to the owner
    modifier onlyOwner() {
        require(msg.sender == owner, "Not the contract owner");
        _;
    }

    // Events
    event TokensPurchased(
        address indexed buyer,
        uint ethSpent,
        uint tokensBought
    );
    event TokensWithdrawn(uint amount);
    event ContractFunded(uint amount);

    // Constructor to initialize contract
    constructor(
        address _token,
        uint _tokenRatePerEth,
        uint _minPurchase,
        uint _maxPurchase
    ) {
        uint decimal = 18;
        owner = msg.sender;
        token = IERC20(_token);
        tokenRatePerEth = _tokenRatePerEth;
        minPurchase = _minPurchase * 10 ** decimal;
        maxPurchase = _maxPurchase * 10 ** decimal;
    }

    // Function to buy tokens
    function buyTokens() public payable {
        require(msg.value > 0, "Send ETH to buy tokens");

        require(
            msg.value >= minPurchase,
            "Amount is below the minimum purchase limit"
        );
        require(
            msg.value <= maxPurchase,
            "Amount exceeds the maximum purchase limit"
        );

        uint tokensToBuy = msg.value * tokenRatePerEth;
        uint contractBalance = token.balanceOf(address(this));

        require(
            tokensToBuy <= contractBalance,
            "Not enough tokens in the contract"
        );

        // Update state
        userPurchases[msg.sender] += tokensToBuy;
        tokensSold += tokensToBuy;

        // Transfer tokens to buyer
        require(
            token.transfer(msg.sender, tokensToBuy),
            "Token transfer failed"
        );

        emit TokensPurchased(msg.sender, msg.value, tokensToBuy);

        // Transfer received ETH to owner
        payable(owner).transfer(msg.value);

        emit TokensWithdrawn(msg.value);
    }

    // Function to withdraw collected ETH (onlyOwner)
    function withdrawETH() public onlyOwner {
        payable(owner).transfer(address(this).balance);
    }

    // Function to withdraw unsold tokens (onlyOwner)
    function withdrawTokens(uint _amount) public onlyOwner {
        require(token.transfer(owner, _amount), "Token withdrawal failed");
        emit TokensWithdrawn(_amount);
    }

    // Function to fund the contract with tokens
    function fundContract(uint _amount) public onlyOwner {
        require(
            token.transferFrom(msg.sender, address(this), _amount),
            "Funding failed"
        );
        emit ContractFunded(_amount);
    }

    function tokenBalance() public view returns (uint) {
        return token.balanceOf(address(this));
    }

    // Fallback function to handle accidental ETH transfers
    receive() external payable {
        buyTokens(); // Redirect to token purchase
    }

    fallback() external payable {
        buyTokens(); // Redirect to token purchase
    }
}
