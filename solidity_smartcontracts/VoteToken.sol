// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

 
contract VoteToken is ERC20Votes {


    mapping(address => uint256) balances;
    mapping(address => mapping (address => uint256)) allowed;

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

    function _burn(address account, uint256 amount)
        internal
        override(ERC20Votes)
    {
        super._burn(account, amount);
    }
}

contract VoteTokenProvider {
    ERC20Votes public token;
    constructor(){
        token = new VoteToken("DAO_TOKEN","DT",100);
    }

    function getTokens() payable public{
        ERC20Votes(token).transfer(msg.sender,100);

    }


}
