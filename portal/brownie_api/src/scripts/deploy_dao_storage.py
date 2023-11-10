from brownie import (
    DaoStorage
)

governor_account='0x70997970C51812dc3A010C7d01b50e0d17dc79C8'


def main():
    DaoStorage.deploy({"from": governor_account})
    