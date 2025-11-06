// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

contract Governance is
    Governor,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl
{
    uint256 public votingDelay_;
    uint256 public votingPeriod_;

    // Define the struct
    struct DAOData {
        string dataInfo;
        string IpfsHash;
        string Timestamp;
    }

    DAOData[] private DAOdata;

    event DataAdded(string dataInfo, string IpfsHash, string Timestamp, uint256 index);

    constructor(
        ERC20Votes _token,
        TimelockController _timelock,
        uint256 _quorum,
        uint256 _votingDelay,
        uint256 _votingPeriod
    )
        Governor("")
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(_quorum)
        GovernorTimelockControl(_timelock)
    {
        votingDelay_ = _votingDelay;
        votingPeriod_ = _votingPeriod;
    }

    // ========== DAO Data Management Functions ==========

    /**
     * @dev Add data to the DAOdata array
     */
    function addData(
        string memory _dataInfo,
        string memory _IpfsHash,
        string memory _Timestamp
    ) external {
        DAOData memory newData = DAOData({
            dataInfo: _dataInfo,
            IpfsHash: _IpfsHash,
            Timestamp: _Timestamp
        });
        DAOdata.push(newData);
        emit DataAdded(_dataInfo, _IpfsHash, _Timestamp, DAOdata.length - 1);
    }

 
    function getData(uint256 index) external view returns (
        string memory dataInfo,
        string memory IpfsHash,
        string memory Timestamp
    ) {
        require(index < DAOdata.length, "Index out of bounds");
        DAOData memory data = DAOdata[index];
        return (data.dataInfo, data.IpfsHash, data.Timestamp);
    }


    function getAllData() external view returns (DAOData[] memory) {
        return DAOdata;
    }


    function getDataArrayLength() external view returns (uint256) {
        return DAOdata.length;
    }


    function votingDelay() public view override returns (uint256) {
        return votingDelay_;
    }

    function votingPeriod() public view override returns (uint256) {
        return votingPeriod_;
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

    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) public override(Governor, IGovernor) returns (uint256) {
        return super.propose(targets, values, calldatas, description);
    }

    function cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) public override(Governor, IGovernor) returns (uint256) {
        return super.cancel(targets, values, calldatas, descriptionHash);
    }

    function _execute(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) {
        super._execute(proposalId, targets, values, calldatas, descriptionHash);
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