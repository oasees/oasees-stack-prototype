import pytest
import warnings
from brownie import accounts, VoteTokenProvider, VoteToken, TimeLock, Governance, DaoAction, chain, web3
import time

warnings.filterwarnings("ignore", message="Development network has a block height of*")

@pytest.fixture(autouse=True, scope="session")
def setup_dao():
    deployer = accounts.add('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d')
    voter1 = accounts.add('0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a')
    voter2 = accounts.add('0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6')
    voter3 = accounts.add('0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a')
    voter4 = accounts.add('0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba')
    non_voter = accounts.add('0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e')

    print("\nDeploying DAO contracts...")
    
    token_provider = VoteTokenProvider.deploy({'from': deployer})
    token = VoteToken.at(token_provider.token())
    print("✓ Token contracts deployed")

    timelock = TimeLock.deploy(
        1, [], [], [], {'from': deployer}
    )
    print("✓ TimeLock deployed")

    governance = Governance.deploy(
        token,
        timelock,
        4,  # 4% quorum
        1,  # 1 block voting delay
        5,  # 5 blocks voting period
        {'from': deployer}
    )
    print("✓ Governance deployed")

    daoaction = DaoAction.deploy({'from': deployer})
    print("✓ DaoAction deployed")

    PROPOSER_ROLE = timelock.PROPOSER_ROLE()
    EXECUTOR_ROLE = timelock.EXECUTOR_ROLE()
    TIMELOCK_ADMIN_ROLE = timelock.TIMELOCK_ADMIN_ROLE()

    timelock.grantRole(PROPOSER_ROLE, governance, {'from': deployer})
    timelock.grantRole(EXECUTOR_ROLE, governance, {'from': deployer})
    timelock.grantRole(TIMELOCK_ADMIN_ROLE, deployer, {'from': deployer})
    print("✓ Roles configured")

    daoaction.transferOwnership(timelock, {'from': deployer})
    print("✓ DaoAction ownership transferred")

    # Setup initial tokens and delegation
    token_provider.getTokens({'from': deployer})
    token.delegate(deployer, {'from': deployer})
    chain.mine(1)

    initial_voters = [voter1, voter2]
    for voter in initial_voters:
        token_provider.getTokens({'from': voter})
        token.delegate(voter, {'from': voter})
        chain.mine(1)

    # Add initial members through governance
    for voter in [deployer,voter1,voter2]:
        description = f"Add initial member {voter.address} - {int(time.time())}"
        calldata = governance.addMember.encode_input(voter.address)
        
        tx = governance.propose(
            [governance.address],
            [0],
            [calldata],
            description,
            {'from': deployer}
        )
        proposal_id = tx.return_value
        
        chain.mine(governance.votingDelay() + 1)
        governance.castVote(proposal_id, 1, {'from': deployer})
        chain.mine(governance.votingPeriod())
        
        governance.queue(
            [governance.address],
            [0],
            [calldata],
            web3.keccak(text=description),
            {'from': deployer}
        )
        chain.mine()
        
        governance.execute(
            [governance.address],
            [0],
            [calldata],
            web3.keccak(text=description),
            {'from': deployer}
        )
        print(f"✓ Added initial member: {voter.address}")

    return {
        'token_provider': token_provider,
        'token': token,
        'timelock': timelock,
        'governance': governance,
        'daoaction': daoaction,
        'deployer': deployer,
        'voter1': voter1,
        'voter2': voter2,
        'voter3': voter3,
        'voter4': voter4,
        'non_voter': non_voter
    }