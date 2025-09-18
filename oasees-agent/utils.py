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


def _parse_logical_expression(expr):
    """
    Parse logical expressions with proper operator precedence.
    Returns parsed structure with operators and conditions.
    """
    # Split on logical operators while preserving them
    import re

    # First, handle parentheses by recursion (simplified for now)
    # For this fix, we'll focus on proper AND/OR detection without parentheses support

    # Tokenize the expression
    tokens = re.split(r'\s+(and|or)\s+', expr.strip(), flags=re.IGNORECASE)

    if len(tokens) == 1:
        return {'type': 'condition', 'condition': tokens[0].strip()}

    # Build expression tree (simplified - left-associative)
    result = {'type': 'condition', 'condition': tokens[0].strip()}

    for i in range(1, len(tokens), 2):
        if i + 1 < len(tokens):
            operator = tokens[i].lower()
            right_condition = tokens[i + 1].strip()

            result = {
                'type': 'operation',
                'operator': operator,
                'left': result,
                'right': {'type': 'condition', 'condition': right_condition}
            }

    return result

def _build_promql_from_parsed(parsed_expr, metric_prefix="oasees_"):
    """
    Build PromQL query from parsed expression tree.
    """
    if parsed_expr['type'] == 'condition':
        # Single condition
        condition = parsed_expr['condition']
        conditions = re.findall(r'(\w+)\s*([><=!]+)\s*(\d+(?:\.\d+)?)', condition)

        if len(conditions) == 1:
            metric, operator, threshold = conditions[0]
            full_metric = f"{metric_prefix}{metric}"
            return f'{{__name__="{full_metric}",source="replace"}} {operator} {threshold}'
        else:
            # Multiple conditions in single expression - shouldn't happen with proper parsing
            return None

    elif parsed_expr['type'] == 'operation':
        left_query = _build_promql_from_parsed(parsed_expr['left'], metric_prefix)
        right_query = _build_promql_from_parsed(parsed_expr['right'], metric_prefix)

        if left_query is None or right_query is None:
            return None

        if parsed_expr['operator'] == 'and':
            # For AND operations, use PromQL and operator for proper boolean evaluation
            return f'({left_query}) and ({right_query})'
        else:  # 'or'
            # For OR operations, use PromQL or operator
            return f'({left_query}) or ({right_query})'

    return None

def query_construct(events, proposal_contents, positive_vote, metric_prefix="oasees_"):
    """
    Construct PromQL queries from event expressions with proper AND/OR parsing
    """
    queries = []

    for i, expr in enumerate(events):
        # Parse the logical expression properly
        parsed_expr = _parse_logical_expression(expr)

        # Build PromQL query from parsed expression
        query = _build_promql_from_parsed(parsed_expr, metric_prefix)

        if query is None:
            # Fallback for unparseable expressions
            conditions = re.findall(r'(\w+)\s*([><=!]+)\s*(\d+(?:\.\d+)?)', expr)
            if conditions:
                metric, operator, threshold = conditions[0]
                full_metric = f"{metric_prefix}{metric}"
                query = f'{{__name__="{full_metric}",source="replace"}} {operator}  {threshold}'

        # Handle vote query with same logic
        vote_query = None
        if i < len(positive_vote):
            vote_expr = positive_vote[i]
            parsed_vote_expr = _parse_logical_expression(vote_expr)
            vote_query = _build_promql_from_parsed(parsed_vote_expr, metric_prefix)

            if vote_query is None:
                # Fallback for unparseable vote expressions
                vote_conditions = re.findall(r'(\w+)\s*([><=!]+)\s*(\d+(?:\.\d+)?)', vote_expr)
                if vote_conditions:
                    metric, operator, threshold = vote_conditions[0]
                    full_metric = f"{metric_prefix}{metric}"
                    vote_query = f'{{__name__="{full_metric}",source="replace"}} {operator}  {threshold}'

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