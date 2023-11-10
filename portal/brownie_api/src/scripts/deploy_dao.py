from brownie import (
    GovernorContract,
    GovernanceToken,
    GovernanceTimeLock,
    DaoStorage,
    Box,
    Contract,
    config,
    network,
    accounts,
    chain,
)
from web3 import Web3, constants
import time
import argparse





QUORUM_PERCENTAGE = 4

VOTING_PERIOD = 9
VOTING_DELAY = 0

MIN_DELAY = 0



voter_accounts=[
    '0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199',
    '0xdd2fd4581271e230360230f9337d5c0430bf44c0',
    '0xbda5747bfd65f08deb54cb465eb87d40e51b197e',
    '0x2546bcd3c84621e976d8185a91a922ae77ecec30'
]


def deploy_governor(dao_name,governor_account):
    #DEPLOY VOTING TOKEN
    #-------------------------------------------------------------------------------
    governance_token = (
        GovernanceToken.deploy(
            {"from": governor_account}

        )
    )

    
    for va in voter_accounts:
        governance_token.transfer(va,50,{"from": governor_account})
        governance_token.delegate(va, {"from": governor_account})
    
    governance_time_lock = governance_time_lock = (
        GovernanceTimeLock.deploy(
            MIN_DELAY,
            [],
            [],
            {"from": governor_account}
        )

    )
    #-------------------------------------------------------------------------------
    #DEPLOY GOVERNANCE
    #-------------------------------------------------------------------------------
    governor = GovernorContract.deploy(
        governance_token.address,
        governance_time_lock.address,
        QUORUM_PERCENTAGE,
        VOTING_PERIOD,
        VOTING_DELAY,
        dao_name,
        {"from": governor_account}
    )
    

    proposer_role = governance_time_lock.PROPOSER_ROLE()
    executor_role = governance_time_lock.EXECUTOR_ROLE()
    timelock_admin_role = governance_time_lock.TIMELOCK_ADMIN_ROLE()
    governance_time_lock.grantRole(proposer_role, governor, {"from": governor_account})
    governance_time_lock.grantRole(
        executor_role, constants.ADDRESS_ZERO, {"from": governor_account}
    )
    tx = governance_time_lock.revokeRole(
        timelock_admin_role, governor_account, {"from": governor_account}
    )
    tx.wait(1)

    box = Box.deploy({"from": governor_account})
    
    tx = box.transferOwnership(GovernanceTimeLock[-1], {"from": governor_account})
    tx.wait(1)





def run(governor_account):
   
    deploy_governor("DAO",governor_account)


def main():
    pass
