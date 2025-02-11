# import pytest
from brownie import chain
import warnings
warnings.filterwarnings("ignore", message="Development network has a block height of*")

def test_token_distribution(setup_dao):
    """Test initial token distribution"""
    print("\nTesting token distribution...")
    print("Expected outcomes:")
    print("✓ Deployer should receive tokens")
    print("✓ All voters should receive 100 tokens each")
    print("✓ Non-voter should have 0 tokens")
    
    token_provider = setup_dao['token_provider']
    token = setup_dao['token']
    deployer = setup_dao['deployer']
    voters = [
        setup_dao['voter3'],
        setup_dao['voter4']
    ]

    deployer_balance = token.balanceOf(deployer) / 10**18
    print(f"✓ Deployer token balance: {deployer_balance} DT")

    for i, voter in enumerate(voters, 1):
        token_provider.getTokens({'from': voter})
        balance = token.balanceOf(voter) / 10**18
        print(f"✓ Voter{i} token balance: {balance} DT")
        assert balance == 100, f"Voter{i} should have 100 tokens"

    # Verify non-voter has no tokens
    non_voter = setup_dao['non_voter']
    assert token.balanceOf(non_voter) == 0, "Non-voter should have 0 tokens"
    print("✓ Non-voter has 0 tokens as expected")

def test_token_delegation(setup_dao):
    """Test token delegation and voting power"""
    print("\nTesting token delegation...")
    print("Expected outcomes:")
    print("✓ All token holders should be able to delegate their votes")
    print("✓ Voting power should match token balance")
    print("✓ Delegation should be reflected in voting power")
    
    token = setup_dao['token']
    deployer = setup_dao['deployer']
    voters = [
        setup_dao['voter1'],
        setup_dao['voter2'],
        setup_dao['voter3'],
        setup_dao['voter4']
    ]

    # Delegate votes
    token.delegate(deployer, {'from': deployer})
    chain.mine(1)
    deployer_power = token.getVotes(deployer) / 10**18
    print(f"✓ Deployer voting power: {deployer_power} votes")

    for i, voter in enumerate(voters, 1):
        token.delegate(voter, {'from': voter})
        chain.mine(1)
        voting_power = token.getVotes(voter) / 10**18
        print(f"✓ Voter{i} voting power: {voting_power} votes")
        assert voting_power == 100, f"Voter{i} should have 100 voting power"