// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract TestXAU is ERC20, Ownable {
    uint256 public constant FAUCET_CAP = 5e18;

    constructor() ERC20("Test Gold", "tXAU") Ownable(msg.sender) {}

    function faucet(uint256 amount) external {
        require(amount <= FAUCET_CAP, "faucet: max 5 per call");
        _mint(msg.sender, amount);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
