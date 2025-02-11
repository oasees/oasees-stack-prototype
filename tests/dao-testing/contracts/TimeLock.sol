// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/governance/TimelockController.sol";

contract TimeLock is TimelockController {
    constructor(
        uint256 _minDelay,
        address[] memory _proposers,
        address[] memory _executors,
        address[] memory _cancellers
    ) TimelockController(_minDelay, _proposers, _executors, msg.sender) {
        // Grant admin role to the deployer explicitly
        _grantRole(TIMELOCK_ADMIN_ROLE, msg.sender);
        
        // Grant proposer role to proposers
        for(uint i = 0; i < _proposers.length; i++) {
            _grantRole(PROPOSER_ROLE, _proposers[i]);
        }
        
        // Grant executor role to executors
        for(uint i = 0; i < _executors.length; i++) {
            _grantRole(EXECUTOR_ROLE, _executors[i]);
        }
    }
}