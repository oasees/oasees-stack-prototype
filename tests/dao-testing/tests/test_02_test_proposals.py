from brownie import chain,web3


def get_proposal_state_string(state):
    states = {
        0: "Pending", 1: "Active", 2: "Canceled", 3: "Defeated",
        4: "Succeeded", 5: "Queued", 6: "Expired", 7: "Executed"
    }
    return states.get(state, "Unknown")



def test_proposal_creation_and_voting(setup_dao):
    governance = setup_dao['governance']
    daoaction = setup_dao['daoaction']
    deployer = setup_dao['deployer']
    voter1 = setup_dao['voter1']
    voter2 = setup_dao['voter2']
    non_voter = setup_dao['non_voter']
    token = setup_dao['token']

    # First proposal: Set value to 42
    description = "Set daoaction value to 42"
    calldata = daoaction.store.encode_input(42)
    
    # Get snapshot before proposal
    chain.mine(1)
    prev_block = chain[-1].number
    
    tx = governance.propose(
        [daoaction.address], [0], [calldata], description,
        {'from': deployer}
    )
    proposal_id = tx.return_value
    print(f"✓ First proposal created at block {prev_block + 1}")

    # Verify voting weights at snapshot
    voting_power = governance.getVotes(deployer, prev_block)
    assert voting_power > 0, "Proposer should have voting power"
    print(f"✓ Proposer voting power: {voting_power}")

    # Wait for voting delay
    chain.mine(governance.votingDelay() + 1)
    assert governance.state(proposal_id) == 1, "Proposal should be active"

    # Test voting for first proposal (should pass)
    votes_needed = governance.proposalThreshold() + 1
    governance.castVote(proposal_id, 1, {'from': deployer})
    governance.castVote(proposal_id, 1, {'from': voter1})
    governance.castVote(proposal_id, 1, {'from': voter2})
    print(f"✓ Cast {votes_needed} votes for first proposal")

    # Wait for voting period
    chain.mine(governance.votingPeriod())
    
    # Queue and execute first proposal
    description_hash = web3.keccak(text=description)
    governance.queue([daoaction.address], [0], [calldata], description_hash, {'from': deployer})
    chain.mine(1)
    governance.execute([daoaction.address], [0], [calldata], description_hash, {'from': deployer})
    
    # Verify first proposal execution
    assert daoaction.retrieve() == 42
    print(f"✓ First proposal executed, daoaction value: {daoaction.retrieve()}")

    # Second proposal: Set value to 100 (this one will fail)
    description2 = "Set daoaction value to 100"
    calldata2 = daoaction.store.encode_input(100)
    
    chain.mine(1)
    prev_block2 = chain[-1].number
    
    tx2 = governance.propose(
        [daoaction.address], [0], [calldata2], description2,
        {'from': deployer}
    )
    proposal_id2 = tx2.return_value
    print(f"✓ Second proposal created at block {prev_block2 + 1}")

    # Wait for voting delay
    chain.mine(governance.votingDelay() + 1)
    
    # Cast votes against second proposal
    governance.castVote(proposal_id2, 0, {'from': deployer})
    governance.castVote(proposal_id2, 0, {'from': voter1})
    governance.castVote(proposal_id2, 0, {'from': voter2})
    print("✓ Cast votes against second proposal")

    # Wait for voting period
    chain.mine(governance.votingPeriod())
    
    # Verify second proposal failed
    assert governance.state(proposal_id2) == 3  # Defeated
    print("✓ Second proposal defeated")

    # Third proposal: Set value to 84 (this will pass)
    description3 = "Set daoaction value to 84"
    calldata3 = daoaction.store.encode_input(84)
    
    chain.mine(1)
    prev_block3 = chain[-1].number
    
    tx3 = governance.propose(
        [daoaction.address], [0], [calldata3], description3,
        {'from': deployer}
    )
    proposal_id3 = tx3.return_value
    print(f"✓ Third proposal created at block {prev_block3 + 1}")

    # Wait for voting delay
    chain.mine(governance.votingDelay() + 1)
    
    # Cast votes for third proposal
    governance.castVote(proposal_id3, 1, {'from': deployer})
    governance.castVote(proposal_id3, 1, {'from': voter1})
    governance.castVote(proposal_id3, 1, {'from': voter2})
    print("✓ Cast votes for third proposal")

    # Wait for voting period
    chain.mine(governance.votingPeriod())
    
    # Queue and execute third proposal
    description_hash3 = web3.keccak(text=description3)
    governance.queue([daoaction.address], [0], [calldata3], description_hash3, {'from': deployer})
    chain.mine(1)
    governance.execute([daoaction.address], [0], [calldata3], description_hash3, {'from': deployer})
    
    # Print final state
    print(f"\nFinal daoaction value: {daoaction.retrieve()}")
    print("\nProposal States:")
    print(f"Proposal 1 (Set to 42): {get_proposal_state_string(governance.state(proposal_id))}")
    print(f"Proposal 2 (Set to 100): {get_proposal_state_string(governance.state(proposal_id2))}")
    print(f"Proposal 3 (Set to 84): {get_proposal_state_string(governance.state(proposal_id3))}")
