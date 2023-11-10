// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";



contract Marketplace is ReentrancyGuard {

    // Variables
    address payable public immutable feeAccount; // the account that receives fees
    uint public immutable feePercent; // the fee percentage on sales 
    uint public itemCount; 

    struct Item {
        uint itemId;
        IERC721 nft;
        uint tokenId;
        uint price;
        address payable seller;
        address[] owners; // Array of owners
        uint copiesAvailable; // Number of copies available
        bool sold;
    }


    // itemId -> Item
    mapping(uint => Item) public items;

    event Offered(
        uint itemId,
        address indexed nft,
        uint tokenId,
        uint price,
        address indexed seller
    );
    event Bought(
        uint itemId,
        address indexed nft,
        uint tokenId,
        uint price,
        address indexed seller,
        address indexed buyer
    );

    constructor(uint _feePercent) {
        feeAccount = payable(msg.sender);
        feePercent = _feePercent;
    }


    function makeItem(IERC721 _nft, uint _tokenId, uint _price, uint _copiesAvailable) external nonReentrant {
        require(_price > 0, "Price must be greater than zero");
        require(_copiesAvailable > 0, "Copies available must be greater than zero");
        
        itemCount++;
        address[] memory initialOwners = new address[](_copiesAvailable);
        initialOwners[0] = msg.sender;
        // transfer nft
        _nft.transferFrom(msg.sender, address(this), _tokenId);
        // add new item to items mapping
        items[itemCount] = Item (
            itemCount,
            _nft,
            _tokenId,
            _price,
            payable(msg.sender),
            initialOwners,
            _copiesAvailable,
            false
        );
        // emit Offered event
        emit Offered(
            itemCount,
            address(_nft),
            _tokenId,
            _price,
            msg.sender
        );
    }


    function purchaseItem(uint _itemId) external payable nonReentrant {
        uint _totalPrice = getTotalPrice(_itemId);
        Item storage item = items[_itemId];
        require(_itemId > 0 && _itemId <= itemCount, "Item doesn't exist");
        require(msg.value >= _totalPrice, "Not enough ether to cover item price and market fee");
        require(!item.sold, "Item already sold");
        require(item.copiesAvailable > 0, "No more copies available");

        // Transfer ownership of the NFT to the buyer
        item.nft.transferFrom(address(this), msg.sender, item.tokenId);

        // Add the buyer to the list of owners
        item.owners.push(msg.sender);
        item.copiesAvailable--;

        // Pay the seller and the marketplace fee
        item.seller.transfer(item.price);
        feeAccount.transfer(_totalPrice - item.price);

        // Emit Bought event
        emit Bought(
            _itemId,
            address(item.nft),
            item.tokenId,
            item.price,
            item.seller,
            msg.sender
        );

        // If no more copies are available, mark the item as sold
        if (item.copiesAvailable == 0) {
            item.sold = true;
        }
    }




    function getTotalPrice(uint _itemId) view public returns(uint){
        return((items[_itemId].price*(100 + feePercent))/100);
    }
}
