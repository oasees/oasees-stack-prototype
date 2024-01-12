// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract DaoIndexer is ReentrancyGuard {
  using Counters for Counters.Counter;
  Counters.Counter private _daoCount;
  address payable private _marketOwner;
  mapping(uint256 => DAO_PLACEHOLDER) private _idToDAO;
  struct DAO_PLACEHOLDER {
    uint256 tokenId;
    address payable seller;
    address payable owner;
    string  desc_uri;
    bool listed;
  }


 constructor() {
    _marketOwner = payable(msg.sender);
  }

  function makeDaoPlaceholder(string memory _desc_uri) public payable nonReentrant {
  
    _daoCount.increment();
    uint256 daoCount = _daoCount.current();
    

    _idToDAO[daoCount] = DAO_PLACEHOLDER(
      daoCount, 
      payable(msg.sender),
      payable(address(this)),
      _desc_uri,
      true
    );
    
  }

 
  function getListedDaos() public view returns (DAO_PLACEHOLDER[] memory) {
    uint daoCount = _daoCount.current();
    uint ListedDaoCount = 0;
    for (uint i = 0; i < daoCount; i++) {
      if (_idToDAO[i + 1].seller == msg.sender && _idToDAO[i + 1].listed) {
        ListedDaoCount++;
      }
    }

    DAO_PLACEHOLDER[] memory daos = new DAO_PLACEHOLDER[](ListedDaoCount);
    uint daoIndex = 0;
    for (uint i = 0; i < daoCount; i++) {
      if (_idToDAO[i + 1].seller == msg.sender && _idToDAO[i + 1].listed) {
        daos[daoIndex] = _idToDAO[i + 1];
        daoIndex++;
      }
    }
    return daos;
  }
}
