// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract AccountNFT is ERC721URIStorage{

    string private _baseTokenURI;

    constructor() ERC721("AccountToken", "OACCT") {

    }

    function mint(string memory _tokenURI) public {
        _safeMint(msg.sender, 1);
        _setTokenURI(1, _tokenURI);
    }
}
