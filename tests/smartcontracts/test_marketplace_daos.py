"""
Tests for the Marketplace SmartContract, regarding the creation and joining of DAOs.
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

def create_dao(marketplace,token,amount=1, creator=''):
    """Used inside tests to populate the marketplace with a number of DAOs."""

    if not creator:
        creator = account

    for i in range(amount):
        token.mint("test", {"from": creator})

        token_id = i+1
        desc_uri =  "this is a test" + str(i+1)

        marketplace.makeDao(token.address, 0, desc_uri, token_id, True, {
            "from":creator,
            "value":marketplace.LISTING_FEE()
        })


    return token_id,desc_uri


def test_successful_dao_creation(marketplace,token):

    create_dao(marketplace,token,creator=accounts[1])
    create_dao(marketplace,token,amount=2,creator=accounts[0])

    # Assert that account-1 retrieves 1 joined and 2 listed DAOs on the Marketplace
    assert len(marketplace.getlistedDaos.call({"from":accounts[1]})) == 2
    assert len(marketplace.getJoinedDaos.call({"from":accounts[1]})) == 1

    # Assert that account-0 retrieves 2 joined and 1 listed DAOs on the Marketplace
    assert len(marketplace.getlistedDaos({"from":accounts[0]})) == 1
    assert len(marketplace.getJoinedDaos({"from":accounts[0]})) == 2


def test_dao_join(marketplace,token):
    """Tests the scenario of an account joining a DAO. """
    
    token_id, _ = create_dao(marketplace,token,creator=accounts[1])

    marketplace.joinDao(1, {"from":accounts[2]})

    assert len(marketplace.getJoinedDaos.call({"from":accounts[2]})) == 1
    assert accounts[2] in marketplace.getDaoMembers(token_id)


def test_update_dao_tokenId(marketplace,token):
    """Tests the scenario where an NFT is inserted into a DAO."""
    token_id, _ = create_dao(marketplace,token,creator=accounts[1])

    token.mint("New NFT", {"from": accounts[1]})
    new_token_id = token_id + 1

    marketplace.applyDao(1, new_token_id)

    listed_dao = marketplace.getlistedDaos.call({"from":accounts[2]})[0]

    assert listed_dao[1] == new_token_id
    