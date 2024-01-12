// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract DaoStorage {
    string[] public storedHashes;

    function addHash(string memory _ipfsHash) public {
        storedHashes.push(_ipfsHash);
    }

    function getStoredHashes() public view returns (string[] memory) {
        return storedHashes;
    }
}