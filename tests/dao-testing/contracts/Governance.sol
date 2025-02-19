// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";

contract Governance is
    Governor,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl
{
    uint256 public votingDelay_;
    uint256 public votingPeriod_;
    address[] public members;
    mapping(address => bool) public isMember;

    struct ProposalInfo {
        address proposer;
        uint256 startBlock;
        uint256 endBlock;
        string description;
        bool executed;
        mapping(address => bool) hasVoted;
    }

    mapping(uint256 => ProposalInfo) public proposalDetails;
    uint256[] public allProposals;

    event MemberAdded(address indexed member);
    event MemberRemoved(address indexed member);

    constructor(
        IVotes _token,
        TimelockController _timelock,
        uint256 _quorum,
        uint256 _votingDelay,
        uint256 _votingPeriod
    )
        Governor("OASEES DAO")
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(_quorum)
        GovernorTimelockControl(_timelock)
    {
        votingDelay_ = _votingDelay;
        votingPeriod_ = _votingPeriod;
    }

    // Add a new member
    function addMember(address _member) external onlyGovernance {
        require(!isMember[_member], "Already a member");
        members.push(_member);
        isMember[_member] = true;
        emit MemberAdded(_member);
    }

    // Remove a member
    function removeMember(address _member) external onlyGovernance {
        require(isMember[_member], "Not a member");
        
        // Find and remove from array
        for (uint i = 0; i < members.length; i++) {
            if (members[i] == _member) {
                members[i] = members[members.length - 1];
                members.pop();
                break;
            }
        }
        
        isMember[_member] = false;
        emit MemberRemoved(_member);
    }

    // Get all members
    function getAllMembers() external view returns (address[] memory) {
        return members;
    }

    // Get total number of members
    function getMemberCount() external view returns (uint256) {
        return members.length;
    }

    function votingDelay() public view override returns (uint256) {
        return votingDelay_;
    }

    function votingPeriod() public view override returns (uint256) {
        return votingPeriod_;
    }

    function getAllProposals() public view returns (uint256[] memory) {
        return allProposals;
    }

    function getProposalVoters(uint256 proposalId) public view returns (bool) {
        return proposalDetails[proposalId].hasVoted[msg.sender];
    }

    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) public override(Governor, IGovernor) returns (uint256) {
        uint256 proposalId = super.propose(targets, values, calldatas, description);
        
        ProposalInfo storage newProposal = proposalDetails[proposalId];
        newProposal.proposer = msg.sender;
        newProposal.startBlock = block.number + votingDelay_;
        newProposal.endBlock = block.number + votingDelay_ + votingPeriod_;
        newProposal.description = description;
        
        allProposals.push(proposalId);
        return proposalId;
    }

    function quorum(uint256 blockNumber)
        public
        view
        override(IGovernor, GovernorVotesQuorumFraction)
        returns (uint256)
    {
        return super.quorum(blockNumber);
    }

    function getVotes(address account, uint256 blockNumber)
        public
        view
        override(IGovernor, Governor)
        returns (uint256)
    {
        return super.getVotes(account, blockNumber);
    }

    function state(uint256 proposalId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (ProposalState)
    {
        return super.state(proposalId);
    }

    function _execute(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) {
        super._execute(proposalId, targets, values, calldatas, descriptionHash);
        proposalDetails[proposalId].executed = true;
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _executor()
        internal
        view
        override(Governor, GovernorTimelockControl)
        returns (address)
    {
        return super._executor();
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}


