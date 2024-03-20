// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;



import  "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import  "@openzeppelin/contracts/utils/ReentrancyGuard.sol";


contract Treasuary is ReentrancyGuard{
    
      
    address public ERC20Add ;
    mapping (address => uint) BALANCE_REGISTRY;
    mapping (address => mapping (address => bool)) BENEFICIARY_TRANSFER_PERMISSION; 
    mapping (address => mapping(address => uint)) PAYMENTS_REGISTRY;
      

    constructor(address _token) {
        ERC20Add = _token;
    }

    function deposit(uint256 _amount) public {
        // Transfer the tokens from the user's account to the treasury contract
        require(IERC20(ERC20Add).transferFrom(msg.sender, address(this), _amount), "Transfer failed");

        // Update the treasury balance of the user's account  
        BALANCE_REGISTRY[msg.sender] += _amount;
    }

    function withdraw(uint256 _amount) public {
        // Check if the user has enough deposited tokens
        require(BALANCE_REGISTRY[msg.sender] >= _amount, "Not enough deposited tokens");

        // Transfer the tokens from the Treasuary contract to the user's account
        require(IERC20(ERC20Add).transfer(msg.sender, _amount), "");
    
    }

    function addNewBeneficiary(address _beneficiary) public {
        // Check if the user balance is above 0  
        require(BALANCE_REGISTRY[msg.sender] > 0, "You need to deposit some tokens before adding a new beneficiary");
        
        BENEFICIARY_TRANSFER_PERMISSION[msg.sender][_beneficiary] = true;
    }

    function revokeBeneficiary(address _beneficiary) public {
        // Check if the user balance is above 0  
        require(BALANCE_REGISTRY[msg.sender] > 0, "You need to deposit some tokens before adding a new beneficiary");
        
        BENEFICIARY_TRANSFER_PERMISSION[msg.sender][_beneficiary] = false;
    }

    function checkBeneficiaryPermission(address _beneficiary) public view returns(bool allowed){
        // Check if the user balance is above 0  
        require(BALANCE_REGISTRY[msg.sender] > 0, "You need to deposit some tokens before adding a new beneficiary");
        
        allowed = BENEFICIARY_TRANSFER_PERMISSION[msg.sender][_beneficiary];
        return allowed;
    }

    function createPayment(address _beneficiary, uint _amount) public payable{
        // Check if the user has enough deposited tokens
        require(BALANCE_REGISTRY[msg.sender] >= _amount, "Not enough deposited tokens");

        //Check if the user allowed the permission to the beneficiary to recieve the tokens
        require(BENEFICIARY_TRANSFER_PERMISSION[msg.sender][_beneficiary] == true, "The reciever doesn't have the permission to recieve tokens from the sender");


        PAYMENTS_REGISTRY[msg.sender][_beneficiary]+= _amount;
    }

    function checkPayment(address _beneficiary) public view returns(uint amount){
        amount = PAYMENTS_REGISTRY[msg.sender][_beneficiary];
        return amount;
    }

    function getTreasuryBalance() public view returns(uint amount){
        amount = BALANCE_REGISTRY[msg.sender];
        return amount;
    }

    function getPaymentFrom(address _sender_address) nonReentrant() public payable {
        // Check if the sender has made a token payment to the beneficiary 
        require(PAYMENTS_REGISTRY[_sender_address][msg.sender] > 0, "No tokens to be taken");

        //Update the payment value to 0 
        uint _amount = PAYMENTS_REGISTRY[_sender_address][msg.sender]; 
        PAYMENTS_REGISTRY[_sender_address][msg.sender] = 0 ;

        //Update the balance of the deposited amount by the sender 
        BALANCE_REGISTRY[_sender_address]-= _amount;

        // Transfer the tokens to the beneficiary 
        IERC20(ERC20Add).transfer(msg.sender,_amount) ;

    } 

}