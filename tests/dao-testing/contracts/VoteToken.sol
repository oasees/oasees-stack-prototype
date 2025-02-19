// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

contract VoteToken is ERC20Votes {
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply
    ) ERC20(_name, _symbol) ERC20Permit(_name) {
        _mint(msg.sender, _initialSupply);
    }

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20Votes) {
        super._afterTokenTransfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal override(ERC20Votes) {
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount) internal override(ERC20Votes) {
        super._burn(account, amount);
    }
}

contract VoteTokenProvider {
    VoteToken public token;

    constructor() {
        token = new VoteToken("DAO_TOKEN", "DT", 1000 ether);
    }

    function getTokens() payable public {
        require(token.balanceOf(msg.sender) == 0, "Already have tokens");
        token.transfer(msg.sender, 100 ether);
    }
}
