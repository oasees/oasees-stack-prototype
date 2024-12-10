"""
Tests for the Marketplace SmartContract, regarding the publication and purchase of devices.
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


def create_device(marketplace,token,amount=1, seller='', listed=True):
    """Used inside tests to populate the marketplace with a number of NFTs."""

    if not seller:
        seller = account

    for i in range(amount):
        token.mint("test", {"from": seller})

        token_id = i+1
        price = Web3.to_wei(1,"ether")
        desc_uri =  "this is a test device" + str(i+1)

        marketplace.makeDevice(token.address, token_id, price, desc_uri, listed, False, {
            "from":seller,
        })

    return token_id,price,desc_uri


def test_successful_device_listing(marketplace,token):
    """Tests a successful device publication on the Marketplace."""

    token_id, price, desc_uri = create_device(marketplace,token,seller=accounts[1])
    
    listed_device = marketplace.getListedDevices()[0]
    marketplace.getMyDevices()

    assert listed_device[0] == token.address
    assert listed_device[1] == token_id
    assert listed_device[4] == price
    assert listed_device[5] == desc_uri
    assert listed_device[6] is True


def test_successful_device_registration(marketplace,token):
    """
    Tests a successful registration of a device to the OASEES platform.
    i.e. The device is not listed on the Marketplace.
    """

    token_id, price, desc_uri = create_device(marketplace,token,seller=accounts[0],listed=False)

    my_device = marketplace.getMyDevices({"from":accounts[0]})[0]

    assert len(marketplace.getListedDevices()) == 0
    assert my_device[0] == token.address
    assert my_device[1] == token_id
    assert my_device[3] == accounts[0]
    assert my_device[4] == price
    assert my_device[5] == desc_uri
    assert my_device[6] is False


def test_successful_device_purchase(marketplace,token):
    """ Tests the successful purchase of a published device. """

    seller = accounts[1]
    buyer = accounts[0]
    seller_balance_before = Web3.from_wei(seller.balance(),"ether")
    buyer_balance_before = Web3.from_wei(buyer.balance(),"ether")

    token_id, price, desc_uri = create_device(marketplace,token,seller=seller) # Created by seller
    
    marketplace.buyDevice(token.address,token_id, { "from": buyer, "value": price, })

    seller_balance_after = Web3.from_wei(seller.balance(),"ether")
    buyer_balance_after = Web3.from_wei(buyer.balance(),"ether")

    assert len(marketplace.getMyDevices({"from":buyer})) == 1
    assert len(marketplace.getListedDevices()) == 0
    assert seller_balance_after == seller_balance_before + Web3.from_wei(price,"ether")
    assert buyer_balance_after == buyer_balance_before - Web3.from_wei(price,"ether")


def test_failed_device_purchase(marketplace,token):
    """Tests the attempt to purchase a device with insufficient funds."""

    token_id, price, desc_uri = create_device(marketplace,token)
    
    with brownie.reverts("Not enough ether to cover asking price"):
        marketplace.buyDevice(token.address,token_id, { "from": accounts[1], "value": price - 1, })

