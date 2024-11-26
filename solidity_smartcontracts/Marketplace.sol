// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";




contract DaoMembers {

    address [] public members;
    mapping (address => uint256) public indexes;

    function addMember(address _member) public {
      if(indexes[_member] == 0){
        members.push(_member);
        indexes[_member] = members.length;
      }
    }

  function isMember(address _member) public view returns(bool){
    return indexes[_member] !=0;
  }

  function getMembers() public view returns(address[] memory){
    return members;
  }


}


contract OaseesMarketplace is ReentrancyGuard {


  using Counters for Counters.Counter;
  Counters.Counter private _nftsSold;
  Counters.Counter private _nftCount;
  Counters.Counter private _deviceCount;
  Counters.Counter private _daoCount;
  uint256 public LISTING_FEE = 0.0001 ether;
  address payable private _marketOwner;
  mapping(uint256 => NFT) private _idToNFT;
  mapping(uint256 => DEVICE) private _idToDevice;
  mapping(uint256 => DAO) private _idToDao;
  mapping (uint256 => mapping(address => bool)) private daoMembers;
  event Received(address, uint);

  constructor() {
    _marketOwner = payable(msg.sender);
  }

  
  struct DEVICE {
    address nftContract;
    uint256 tokenId;
    address payable seller;
    address payable owner;
    uint price;
    string desc_uri; 
    bool listed;
    uint256 marketPlaceId;
    bool isCluster;
  }

  function makeDevice(address _nftContract, uint256 _tokenId,uint256 _price,string memory _desc_uri,bool listed, bool isCluster) public payable nonReentrant {


    address  _owner = msg.sender;
    address  _seller = msg.sender;

    _deviceCount.increment();

    if(listed){
      IERC721(_nftContract).transferFrom( msg.sender,address(this),_tokenId);
      _owner = address(this);
      emit DeviceListed();
    }else{
      emit DeviceSold(msg.sender);
    }

    _idToDevice[_deviceCount.current()] = DEVICE(
      _nftContract,
      _tokenId,
      payable(_seller), 
      payable(_owner),
      _price,
      _desc_uri,
      listed,
      _deviceCount.current(),
      isCluster
    );

    

  } 

  function getListedDevices() public view returns (DEVICE[] memory) {
    uint256 deviceCount = _deviceCount.current();
    uint256 listedDevices = 0;

    for (uint i = 0; i < deviceCount; i++) {
      if (_idToDevice[i + 1].listed) {
        listedDevices++;
      }
    }


    DEVICE[] memory devices = new DEVICE[](listedDevices);
    uint devicesIndex = 0;
    for (uint i = 0; i < deviceCount; i++) {
      if (_idToDevice[i + 1].listed) {
        devices[devicesIndex] = _idToDevice[i + 1];
        devicesIndex++;
      }
    }
    return devices;
  }

 function buyDevice(address _nftContract, uint256 _tokenId) public payable nonReentrant {
    DEVICE storage device = _idToDevice[_tokenId];
    require(msg.value >= device.price, "Not enough ether to cover asking price");

    address payable buyer = payable(msg.sender);
    payable(device.seller).transfer(msg.value);
    IERC721(_nftContract).transferFrom(address(this), buyer, device.tokenId);
    device.owner = buyer;
    device.listed = false;

    emit DeviceSold(buyer);
  }



  function getMyDevices() public view returns (DEVICE[] memory) {
    uint deviceCount = _deviceCount.current();
    uint myDevicesCount = 0;
    for (uint i = 0; i < deviceCount; i++) {
      if (_idToDevice[i + 1].owner == msg.sender) {
        myDevicesCount++;
      }
    }

    DEVICE[] memory devices = new DEVICE[](myDevicesCount);
    uint deviceIndex = 0;
    for (uint i = 0; i < deviceCount; i++) {
      if (_idToDevice[i + 1].owner == msg.sender) {
        devices[deviceIndex] = _idToDevice[i + 1];
        deviceIndex++;
      }
    }
    return devices;
  }

  struct DAO{
    address nftContract;
    uint256 tokenId;
    string desc_uri;
    DaoMembers members;
    uint256 marketPlaceId;
    uint256 clusterTokenId;
    bool hasCluster;
  }


  event DaoJoined (
    address indexed member_address,
    uint256 tokenId
  );

  event ClusterJoined (
    address indexed member_address
  );


  function makeDao(address _nftContract, uint256 _tokenId,string memory _desc_uri,uint256 _clusterTokenId, bool _hasCluster) public payable nonReentrant returns(uint256) {
  
    _daoCount.increment();

    DaoMembers members = new DaoMembers();

    members.addMember(msg.sender);
    // if(_hasCluster){
    //   members.addMember(msg.sender);
    //   emit ClusterJoined(msg.sender);
    // }

    emit ClusterJoined(msg.sender);
    
    _idToDao[_daoCount.current()] = DAO(
        _nftContract,
        _tokenId,
        _desc_uri,
        members,
        _daoCount.current(),
        _clusterTokenId,
        _hasCluster
        );

    emit NewDAO();
  } 

  function getJoinedDaos() public view returns (DAO[] memory){
    uint daoCount =  _daoCount.current();
    uint isMemberCount = 0;
    for(uint i=0; i < daoCount;i++){
      if(_idToDao[i+1].members.isMember(msg.sender)){
        isMemberCount++;
      }  

    } 


    uint daoIndex = 0;
    DAO[] memory daos = new DAO[](isMemberCount);
    

    for(uint i=0; i < daoCount;i++){

      if(_idToDao[i+1].members.isMember(msg.sender)){
        daos[daoIndex] = _idToDao[i+1];
        daoIndex++;
      }  

    }

    return daos;
  }


  function joinDao(uint256 _tokenId) public payable nonReentrant {

    _idToDao[_tokenId].members.addMember(msg.sender);
    
    emit DaoJoined(msg.sender, _idToDao[_tokenId].tokenId);
  }

  function applyDao(uint256 _marketplaceId, uint256 _tokenId) public payable nonReentrant {
    _idToDao[_marketplaceId].tokenId = _tokenId;
    DAO storage dao = _idToDao[_marketplaceId];
    for (uint i=0 ; i<dao.members.getMembers().length ; i++){
      emit DaoJoined(dao.members.getMembers()[i],dao.tokenId);
    }
  }

  function registerDeviceToCluster(address deviceAddress,uint _tokenId) public {
    _idToDao[_tokenId].members.addMember(deviceAddress);
  }

  function registerDeviceToDao(address deviceAddress,uint _tokenId) public {
    _idToDao[_tokenId].members.addMember(deviceAddress);
    emit DaoJoined(deviceAddress, _idToDao[_tokenId].tokenId);
  }

  function getDaoMembers(uint256 _tokenId) public view returns (address[] memory) {
    return _idToDao[_tokenId].members.getMembers();
  }

  function getlistedDaos() public view returns (DAO[] memory){
    
    uint daoCount =  _daoCount.current();
    uint isMemberCount = 0;
    for(uint i=0; i < daoCount;i++){
      if(_idToDao[i+1].members.isMember(msg.sender)){
        isMemberCount++;
      }  

    }  

    uint daoIndex = 0;
    DAO[] memory daos = new DAO[](daoCount-isMemberCount);
    

    for(uint i=0; i < daoCount;i++){

      if(!_idToDao[i+1].members.isMember(msg.sender)){
        daos[daoIndex] = _idToDao[i+1];
        daoIndex++;
      }  

    }

    return daos;
  }


  struct NFT {
    address nftContract;
    uint256 tokenId;
    address payable seller;
    address payable owner;
    uint256 price;
    string  desc_uri;
    bool listed;
    uint256 marketPlaceId;
  }
  event NFTListed(
    address nftContract,
    uint256 tokenId,
    address seller,
    address owner,
    uint256 price
  );
  event NFTSold(
    address nftContract,
    uint256 tokenId,
    address seller,
    address indexed owner,
    uint256 price
  );

  event NewDAO();

  event DeviceListed();

  event DeviceSold(
    address indexed owner
  );





  // List the NFT on the marketplace
  function makeItem(address _nftContract, uint256 _tokenId, uint256 _price, string memory _desc_uri) public payable nonReentrant {
    require(_price > 0, "Price must be at least 1 wei");
    require(msg.value == LISTING_FEE, "Not enough ether for listing fee");

    IERC721(_nftContract).transferFrom(msg.sender, address(this), _tokenId);
    _marketOwner.transfer(LISTING_FEE);
    _nftCount.increment();

    _idToNFT[_nftCount.current()] = NFT(
      _nftContract,
      _tokenId, 
      payable(msg.sender),
      payable(address(this)),
      _price,
      _desc_uri,
      true,
      _nftCount.current()
    );

    emit NFTListed(_nftContract, _tokenId, msg.sender, address(this), _price);
  }

  // Buy an NFT
  function buyNft(address _nftContract, uint256 _tokenId) public payable nonReentrant {
    NFT storage nft = _idToNFT[_tokenId];
    require(msg.value >= nft.price, "Not enough ether to cover asking price");

    address payable buyer = payable(msg.sender);
    payable(nft.seller).transfer(msg.value);
    IERC721(_nftContract).transferFrom(address(this), buyer, nft.tokenId);
    nft.owner = buyer;
    nft.listed = false;

    _nftsSold.increment();
    emit NFTSold(_nftContract, nft.tokenId, nft.seller, buyer, msg.value);
  }
function getListedNfts() public view returns (NFT[] memory) {
    uint256 nftCount = _nftCount.current();
    uint256 unsoldNftsCount = nftCount - _nftsSold.current();

    NFT[] memory nfts = new NFT[](unsoldNftsCount);
    uint nftsIndex = 0;

    for (uint i = 1; i <= nftCount; i++) {
        NFT storage nft = _idToNFT[i];
        if (nft.listed) {
            nfts[nftsIndex++] = nft;
        }
    }
    return nfts;
}
  function getMyNfts() public view returns (NFT[] memory) {
    uint nftCount = _nftCount.current();
    uint myNftCount = 0;
    for (uint i = 0; i < nftCount; i++) {
      if (_idToNFT[i + 1].owner == msg.sender) {
        myNftCount++;
      }
    }

    NFT[] memory nfts = new NFT[](myNftCount);
    uint nftsIndex = 0;
    for (uint i = 0; i < nftCount; i++) {
      if (_idToNFT[i + 1].owner == msg.sender) {
        nfts[nftsIndex] = _idToNFT[i + 1];
        nftsIndex++;
      }
    }
    return nfts;
  }

  // function getMyListedNfts() public view returns (NFT[] memory) {
  //   uint nftCount = _nftCount.current();
  //   uint myListedNftCount = 0;
  //   for (uint i = 0; i < nftCount; i++) {
  //     if (_idToNFT[i + 1].seller == msg.sender && _idToNFT[i + 1].listed) {
  //       myListedNftCount++;
  //     }
  //   }

  //   NFT[] memory nfts = new NFT[](myListedNftCount);
  //   uint nftsIndex = 0;
  //   for (uint i = 0; i < nftCount; i++) {
  //     if (_idToNFT[i + 1].seller == msg.sender && _idToNFT[i + 1].listed) {
  //       nfts[nftsIndex] = _idToNFT[i + 1];
  //       nftsIndex++;
  //     }
  //   }
  //   return nfts;
  // }
}
