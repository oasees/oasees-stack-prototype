"""
Tests for the Marketplace SmartContract, regarding the publication and purchase of assets.
"""

from brownie import accounts
import brownie
import pytest
from web3 import Web3

# Global variables
account = ""

@pytest.fixture(scope="module")
def marketplace(OaseesMarketplace):
    global account
    account = accounts[0]

    return account.deploy(OaseesMarketplace)

@pytest.fixture(scope="module")
def token(OaseesNFT,marketplace):
    return account.deploy(OaseesNFT, marketplace.address)


@pytest.fixture(autouse=True)
def isolation(fn_isolation):
    pass


def create_nft(marketplace,token,amount=1, seller=''):
    """Used inside tests to populate the marketplace with a number of NFTs."""

    if not seller:
        seller = account

    for i in range(amount):
        token.mint("test", {"from": seller})

        token_id = i+1
        price = Web3.to_wei(1,"ether")
        desc_uri =  "this is a test nft" + str(i+1)



        marketplace.makeItem(token.address, token_id, price, desc_uri, {
            "from":seller,
            "value":marketplace.LISTING_FEE(),
        })

    return token_id,price,desc_uri




def test_successful_nft_listing(marketplace,token):
    """Tests a successful NFT publication on the Marketplace."""
    
    token_id, price, desc_uri = create_nft(marketplace,token)
    listed_nft = marketplace.getListedNfts()[0]

    assert listed_nft[0] == token.address
    assert listed_nft[1] == token_id
    assert listed_nft[4] == price
    assert listed_nft[5] == desc_uri
    assert listed_nft[6] is True


def test_unsuccessful_nft_listing(marketplace,token):
    """Tests the scenarios where NFT publication is rejected by the Marketplace."""

    token_id, price, desc_uri = create_nft(marketplace,token)

    with brownie.reverts("Price must be at least 1 wei"):
        marketplace.makeItem(token.address, token_id, 0, desc_uri, { "from":account, "value":marketplace.LISTING_FEE() })
    
    with brownie.reverts("Not enough ether for listing fee"):
        marketplace.makeItem(token.address, token_id, price, desc_uri, { "from":account })



def test_purchase_nft(marketplace,token):
    """Tests the purchase of a listed NFT and the update of the involved accounts' balances."""
    seller = accounts[0]
    buyer = accounts[1]
    seller_balance_before = Web3.from_wei(seller.balance(),"ether")
    buyer_balance_before = Web3.from_wei(buyer.balance(),"ether")

    # assert len(marketplace.getMyNfts.call({"from":buyer})) == 0

    token_id, price, desc_uri = create_nft(marketplace,token) # Created by seller
    
    marketplace.buyNft(token.address,token_id, { "from": buyer, "value": price, })

    seller_balance_after = Web3.from_wei(seller.balance(),"ether")
    buyer_balance_after = Web3.from_wei(buyer.balance(),"ether")

    assert len(marketplace.getMyNfts.call({"from":buyer})) == 1
    assert len(marketplace.getListedNfts()) == 0
    assert seller_balance_after == seller_balance_before + Web3.from_wei(price,"ether")
    assert buyer_balance_after == buyer_balance_before - Web3.from_wei(price,"ether")


def test_failed_nft_purchase(marketplace,token):
    """Tests the attempt to purchase an NFT with insufficient funds."""

    token_id, price, desc_uri = create_nft(marketplace,token)
    
    with brownie.reverts("Not enough ether to cover asking price"):
        marketplace.buyNft(token.address,token_id, { "from": accounts[1], "value": price - 1, })


def test_purchased_nft(marketplace,token):

    _, price ,_  = create_nft(marketplace,token,3,accounts[2])
    marketplace.buyNft(token.address,1,{ "from": account, "value": price})
    marketplace.buyNft(token.address,3,{ "from": account, "value": price})

    bought_nfts = marketplace.getMyNfts({ "from": account })
    marketplace.getlistedDaos()


    assert len(bought_nfts) == 2
    assert bought_nfts[0][3] == account
    assert bought_nfts[0][6] == False
    assert bought_nfts[0][1] == 1
    assert bought_nfts[1][3] == account
    assert bought_nfts[1][6] == False
    assert bought_nfts[1][1] == 3
