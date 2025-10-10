class DAODeployer {


 
    constructor() {
        this.ethereum = window.ethereum;
        this.userAccount = null;
        this.compiledContracts = null;
        this.deployedContracts = {
            voteToken: null,
            voteTokenProvider: null,
            timelock: null,
            governance: null,
            box: null
        };

        // this.marketplace_address = this.getAddress('OaseesMarketplace')

        // this.nft_address = this.getAddress('OaseesNFT')
        this.web3 = new Web3(window.ethereum);

        this.initializeEventListeners();
        this.initializeAddresses();
    }


    async initializeAddresses() {
        try {
            this.marketplace_address = await this.getAddress('OaseesMarketplace');
            this.nft_address = await this.getAddress('OaseesNFT');
            console.log('Marketplace address:', this.marketplace_address);
            console.log('NFT address:', this.nft_address);
        } catch (error) {
            console.error('Failed to initialize addresses:', error);
        }
    }



    async getAddress(contractName) {
        try {
            const response = await fetch(`http://10.160.3.172:8082/api/v2/search?q=${contractName}`, {
                method: 'GET',
                headers: {
                    'accept': 'application/json'
                }
            });
    
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
    
            const data = await response.json();
            
            if (data.items && data.items.length > 0) {
                return data.items[0].address;
            } else {
                throw new Error(`No contract found with name "${contractName}"`);
            }
        } catch (error) {
            console.error('Error fetching contract address:', error);
            throw error;
        }
    }






    initializeEventListeners() {
        const connectBtn = document.getElementById('connectWallet');
        const deploymentForm = document.getElementById('deploymentForm');
        
        if (connectBtn) {
            connectBtn.addEventListener('click', () => this.connectWallet());
        }
        
        if (deploymentForm) {
            deploymentForm.addEventListener('submit', (e) => this.deployDAO(e));
        }
    }

    async connectWallet() {
        try {
            await this.ethereum.request({
                method: 'wallet_revokePermissions',
                params: [{eth_accounts: {}}],
            });
            const accounts = await this.ethereum.request({
                method: 'eth_requestAccounts'
            });
            this.userAccount = accounts[0];
            this.updateConnectedUI();
            // await this.check_marketplace()
        } catch (error) {
            console.error('Failed to connect wallet:', error);
            alert('Failed to connect wallet. Please try again.');
        }
    }

    async check_marketplace() {
        const web3 = new Web3(window.ethereum)
        const blockscout_api = "http://10.160.3.172:8082/api/v2"
        try {
            const response = await fetch(`${blockscout_api}/smart-contracts/${this.marketplace_address}`);
            const data = await response.json();
            const count = await web3.eth.getTransactionCount(this.userAccount)
            const price = web3.utils.toWei(1 ,'ether')
            try{
                const marketplace = new web3.eth.Contract(data.abi, this.marketplace_address);
                console.log(await marketplace.methods.LISTING_FEE().call())
                const tx = marketplace.methods.buyNft(this.nft_address, 1)

                await tx.send({'from': this.userAccount,'value':price,'nonce': count})
            } catch (e){
                console.log(e)
            }
        } catch (error) {
        }
    }

    async registerDAO(governance, timelock, token, box,daoName) {
        const web3 = new Web3(window.ethereum)
        const blockscout_api = "http://10.160.3.172:8082/api/v2"
        try {
            const response = await fetch(`${blockscout_api}/smart-contracts/${this.marketplace_address}`);
            const count = await web3.eth.getTransactionCount(this.userAccount)
            const data = await response.json();
            const marketplace = new web3.eth.Contract(data.abi, this.marketplace_address);
            const tx = marketplace.methods.makeDao(governance,timelock,token,box,daoName);
            await tx.send({'from': this.userAccount,'nonce': count})
        } catch (e){
            console.error(e)
        }

    }

    updateConnectedUI() {
        const connectBtn = document.getElementById('connectWallet');
        if (connectBtn) {
            connectBtn.innerHTML = `<i class="fas fa-wallet"></i> Connected: ${this.userAccount.substring(0, 6)}...${this.userAccount.substring(38)}`;
            connectBtn.classList.add('connected');
        }
        
        const deployBtn = document.querySelector('.deploy-btn');
        if (deployBtn) {
            deployBtn.disabled = false;
        }
    }

    setCompiledContracts(contracts) {
        this.compiledContracts = contracts;
        console.log('Compiled contracts set:', contracts);
    }

    async deployDAO(e) {
        const btnLoadTxt = document.querySelector('#deploy-btn-loading-text');
        const btnNormalText = document.querySelector('#deploy-btn-text');
        btnNormalText.style.display = 'none';
        btnLoadTxt.style.display = 'flex';
        e.preventDefault();

        if (!this.userAccount || !this.ethereum) {
            alert('Please connect your wallet first!');
            return;
        }

        try {
            const formData = new FormData(e.target);
            const params = {
                minDelay: parseInt(formData.get('minDelay')),
                quorumPercentage: parseInt(formData.get('quorumPercentage')),
                votingPeriod: parseInt(formData.get('votingPeriod')),
                votingDelay: parseInt(formData.get('votingDelay')),
                daoName: formData.get('daoName'),
                daoDesc: formData.get('daoDesc'),
                account: this.userAccount,
            };

            const response = await fetch('/deploy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    params: params
                })
            });
            
            const result = await response.json();

            if(result.success){
                const deploymentOutputContainer = document.getElementById('hiddenContainer');
                deploymentOutputContainer.style.display = 'block';

                let inner = '<p>'
                const res = result.output;
                let governance = ''
                let votetoken = ''
                let votetokenprovider = ''
                let timelock = ''
                let box = ''

                Object.entries(res).forEach(([key,value])=> {
                    inner += `<br>${value.contract_name} : <a href=${value.url}>${value.url}</a><br>`;
                    
                    const contract_name = value.contract_name.toLowerCase()
                    if(contract_name === 'governance'){
                        governance = value.contract_address;
                    } else if (contract_name === 'votetoken'){
                        votetoken = value.contract_address;
                    } else if (contract_name === 'timelock'){
                        timelock = value.contract_address;
                    } else if (contract_name === 'box'){
                        box = value.contract_address;
                    } else if (contract_name === 'voteToken'){
                        votetokenprovider = value.contract_address;
                    } else {
                        console.log('Unknown contract:', contract_name);

                    }
                })
                inner+= '</p>';
                deploymentOutputContainer.innerHTML = inner;

                await this.registerDAO(governance,timelock,votetoken,box,params.daoName);

                btnNormalText.style.display = 'block';
                btnLoadTxt.style.display = 'none';

            } else {
                alert(result.error)
            }
            
        } catch (error) {
            console.error('Deployment failed:', error);
            alert('Deployment failed: ' + error.message);
        }
    }

    // async deployVoteTokenProvider() {
    //     console.log(this.compiledContracts);
    //     const contract = this.compiledContracts.votetokenprovider;
        
    //     const tx = {
    //         from: this.userAccount,
    //         data: contract.bytecode
    //     };

    //     const gasEstimate = await this.ethereum.request({
    //         method: 'eth_estimateGas',
    //         params: [tx]
    //     });

    //     const gasPrice = await this.ethereum.request({
    //         method: 'eth_gasPrice'
    //     });

    //     tx.gas = gasEstimate;
    //     tx.gasPrice = gasPrice;

    //     const txHash = await this.ethereum.request({
    //         method: 'eth_sendTransaction',
    //         params: [tx]
    //     });

    //     const receipt = await this.waitForTransaction(txHash);
    //     this.deployedContractsvotetokenprovider = receipt.contractAddress;
        

    //     this.deployedContractsvotetoken = receipt.logs[0].address; // This might need adjustment
    //     console.log('VoteTokenProvider deployed at:', receipt.contractAddress);
    // }
    

    async sendTransaction(tx) {
        const gasEstimate = await this.ethereum.request({
            method: 'eth_estimateGas',
            params: [tx]
        });

        const gasPrice = await this.ethereum.request({
            method: 'eth_gasPrice'
        });

        tx.gas = gasEstimate;
        tx.gasPrice = gasPrice;

        const txHash = await this.ethereum.request({
            method: 'eth_sendTransaction',
            params: [tx]
        });

        return await this.waitForTransaction(txHash);
    }

    async waitForTransaction(txHash) {
        let receipt = null;
        while (!receipt) {
            receipt = await this.ethereum.request({
                method: 'eth_getTransactionReceipt',
                params: [txHash]
            });
            if (!receipt) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        return receipt;
    }
}

// Initialize deployer when document is loaded

document.addEventListener('DOMContentLoaded', async () => {


    // if (typeof Web3 === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/web3@1.8.0/dist/web3.min.js';
    
    await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
    // }


    window.daoDeployer = new DAODeployer();
});

