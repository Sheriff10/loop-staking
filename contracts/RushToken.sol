// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Import the OpenZeppelin ERC20 implementation.
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract RushToken is ERC20 {
    constructor() ERC20("Rush FUN", "Rush") {
        _mint(msg.sender, 200000000000000000000000000);
    }
}
