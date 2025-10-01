import re
import web3
import requests
import os

device_name = os.environ.get('NODE_NAME')

def validate_json_format(data):
    '''Validate the JSON format of the data.'''

    errors = []

    # Check top-level keys
    required_keys = {"metric_index", "propose_on", "actions_map"}
    missing_keys = required_keys - set(data.keys())
    if missing_keys:
        errors.append(f"Missing required keys: {missing_keys}")

    # Check 'propose_on' structure
    if "propose_on" in data:
        propose_on = data["propose_on"]
        if not isinstance(propose_on, dict):
            errors.append("'propose_on' must be a dictionary")
        else:
            # Check 'events' in 'propose_on'
            if "events" not in propose_on:
                errors.append("'propose_on' must contain 'events' list")
            elif not isinstance(propose_on["events"], list):
                errors.append("'events' must be a list")

            # Check 'proposal_contents' in 'propose_on'
            if "proposal_contents" not in propose_on:
                errors.append("'propose_on' must contain 'proposal_contents' list")
            elif not isinstance(propose_on["proposal_contents"], list):
                errors.append("'proposal_contents' must be a list")
            elif len(propose_on["proposal_contents"]) < 1:
                errors.append("'proposal_contents' must have at least one entry")
            else:
                for idx, content in enumerate(propose_on["proposal_contents"]):
                    if not isinstance(content, dict):
                        errors.append(f"Entry {idx} in 'proposal_contents' must be a dictionary")
                    else:
                        missing_content_keys = {"msg", "action_value"} - set(content.keys())
                        if missing_content_keys:
                            errors.append(f"Entry {idx} in 'proposal_contents' missing keys: {missing_content_keys}")

    # Check 'actions_map'
    if "actions_map" in data:
        actions_map = data["actions_map"]
        if not isinstance(actions_map, dict):
            errors.append("'actions_map' must be a list")
        elif len(actions_map) < 1:
            errors.append("'actions_map' must have at least one entry")

    if errors:
        return False, " || ".join(errors)
    return True, "JSON format is valid"


def _build_promql_query(expr, metric_prefix="oasees_"):
    """
    Build PromQL query by replacing commas with 'or' and formatting each metric properly.
    """
    # Replace commas with ' or '
    normalized_expr = expr.replace(',', ' or ')

    # Split by 'and' and 'or' to get individual metric conditions
    import re
    tokens = re.split(r'\s+(and|or)\s+', normalized_expr.strip(), flags=re.IGNORECASE)

    result_parts = []

    for i in range(0, len(tokens)):
        if i % 2 == 0:  # This is a condition, not an operator
            condition = tokens[i].strip()
            match = re.search(r'(\w+)\s*([><=!]+)\s*(\d+(?:\.\d+)?)', condition)
            if match:
                metric, operator, threshold = match.groups()
                full_metric = f"{metric_prefix}{metric}"
                formatted_condition = f'{{__name__="{full_metric}",source="replace"}} {operator} {threshold}'
                result_parts.append(formatted_condition)
        else:  # This is an operator
            result_parts.append(f' {tokens[i].lower()} ')

    return ''.join(result_parts)

def query_construct(events, proposal_contents, positive_vote, metric_prefix="oasees_"):
    """
    Construct PromQL queries from event expressions
    """
    queries = []

    for i, expr in enumerate(events):
        # Build PromQL query using the new function
        query = _build_promql_query(expr, metric_prefix)

        # Handle vote query with same logic
        vote_query = None
        if i < len(positive_vote):
            vote_expr = positive_vote[i]
            vote_query = _build_promql_query(vote_expr, metric_prefix)

        queries.append({
            'expression': expr,
            'query': query,
            'proposal': proposal_contents[i] if i < len(proposal_contents) else None,
            'vote_query': vote_query
        })

    return queries


def load_contracts(BLOCKCHAIN_URL, BLOCKSCOUT_API_URL):
    '''Helper function to load the base OASEES contracts.'''
    
    w3 = web3.Web3(web3.HTTPProvider(BLOCKCHAIN_URL))

    marketplace_address = "0x5FbDB2315678afecb367f032d93F642f64180aa3"
    nft_address = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"

    marketplace_info = requests.get(f"{BLOCKSCOUT_API_URL}/smart-contracts/{marketplace_address}")
    marketplace_abi = marketplace_info.json()['abi']

    nft_info = requests.get(f"{BLOCKSCOUT_API_URL}/smart-contracts/{nft_address}")
    nft_abi = nft_info.json()['abi']


    marketplace_contract = w3.eth.contract(address=marketplace_address, abi=marketplace_abi)
    nft_contract = w3.eth.contract(address=nft_address, abi=nft_abi)

    return w3, marketplace_contract, nft_contract