from brownie import (
	NFT,
 	Marketplace,
    Contract,
    config,
    network,
    accounts,
    chain,
)


def main():
	account = accounts[0]
	Marketplace.deploy(0,{"from": account})
	NFT.deploy({"from": account})