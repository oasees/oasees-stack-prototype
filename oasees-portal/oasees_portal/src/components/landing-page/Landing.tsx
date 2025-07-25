import './Landing.css'
import {Image, Button, Center, Stack, Stepper, Group, Container, LoadingOverlay, Loader, Modal, Text, List } from '@mantine/core';
import { useState } from 'react';
import { ethers } from "ethers"
import axios from 'axios';

declare global {
    interface Window {
      ethereum: any;
    }
}

interface LandingProps {
    setInfo: any;
    setIsConnected:any;
}

const Landing = ({setInfo,setIsConnected}:LandingProps) => {

    const [active, setActive] = useState(0);
    const nextStep = () => setActive((current) => (current < 3 ? current + 1 : current));
    const prevStep = () => setActive((current) => (current > 0 ? current - 1 : current));
    const [visible,setVisible] = useState(false);
    const [showErrorModal,setShowErrorModal] = useState(false);
    
    const switchToOasees = async () => {
        const chainId = 31337 // Hardhat Net

        if (window.ethereum.net_version !== chainId) {
            await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x7a69' }]
            });
        }
    }
    const connectToMetaMask = async () =>{
        setVisible(true);
        try{
            await switchToOasees();
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

            const account = accounts[0];

            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = await provider.getSigner();

            const callProvider = new ethers.providers.JsonRpcProvider(`http://${process.env.REACT_APP_BLOCKCHAIN_HOST}:8545`,undefined);
            // const callProvider = ""

            var marketplace_address;
            var marketplace_abi;
            var nft_address;
            var nft_abi;

            if(`${process.env.REACT_APP_BLOCKCHAIN_HOST}`){
                const block_explorer_ip = `${process.env.REACT_APP_BLOCKCHAIN_HOST}`;

                
                var response = await axios.get(`http://${block_explorer_ip}:8082/api/v2/search`, {
                    params: {
                      q: 'OaseesMarketplace'
                    },
                    headers: {
                      'accept': 'application/json'
                    }
                });
                  
                marketplace_address = response.data.items[0].address;



                response = await axios.get(`http://${block_explorer_ip}:8082/api/v2/smart-contracts/${marketplace_address}`, {
                    headers: {
                      'accept': 'application/json'
                    }
                });
                  

                marketplace_abi = response.data.abi;


                response = await axios.get(`http://${block_explorer_ip}:8082/api/v2/search`, {
                    params: {
                      q: 'OaseesNFT'
                    },
                    headers: {
                      'accept': 'application/json'
                    }
                });


                nft_address = response.data.items[0].address;

                response = await axios.get(`http://${block_explorer_ip}:8082/api/v2/smart-contracts/${nft_address}`, {
                    headers: {
                      'accept': 'application/json'
                    }
                });
                nft_abi = response.data.abi;
            }


            const account_payload = { user: account };


            const marketplace = new ethers.Contract(marketplace_address, marketplace_abi, await signer)

            const nft = new ethers.Contract(nft_address, nft_abi, await signer)

 
            setInfo({account:account,provider:provider,marketplace:marketplace,nft:nft,callProvider:callProvider});
            setIsConnected(true);
        } catch (error){
            console.error(error);
            setShowErrorModal(true);
        }
        setVisible(false);
        
    }


    return(
        <Container>
        <Modal opened={showErrorModal} onClose={()=>setShowErrorModal(false)} c="red" title="Could not connect to OASEES." size="60%" centered>
            <Text c="black"><u>Make sure that:</u></Text>
            <List type="ordered" c="black" maw="99%" spacing={5}>
                <List.Item>You've added the OASEES Network to the Metamask plugin with the correct information.</List.Item>
                <List.Item>The rest of the stack is fully up and running properly.</List.Item>
                <List.Item>You've replaced the variables in the <b>.env</b> file with <b>your IP Address</b>.</List.Item>
            </List>
            
        </Modal>
        <LoadingOverlay visible={visible} zIndex={1000} overlayProps={{ radius: "lg", blur: 2 }} pos="fixed" loaderProps={{children:<Stack align='center'><Loader color='blue'/>Loading...</Stack>}} />

            <Center maw="100%">
            <Stack align='center'  >
                <Image miw={100} maw="11vw" src="./images/oasees-logo.png" alt="Oasees logo"/>

                <Button color='orange' fz={16} miw={110} w="12vw" mih={40} onClick={connectToMetaMask}>Connect</Button>

                
                <Stepper active={active} onStepClick={setActive} pt={50} w={{sm:'700', md:'800'}}>

                    <Stepper.Step label="First step" description="Connect to Metamask" >
                        <Center pt={10} >
                            <Image src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="Metamask logo" />
                        </Center>
                    </Stepper.Step>

                    <Stepper.Step label="Second step" description="Second step">
                        <Center pt={10} >
                        <Image src="https://cdn3.iconfinder.com/data/icons/design-n-code/100/272127c4-8d19-4bd3-bd22-2b75ce94ccb4-512.png" alt="Placeholder image" />
                        </Center>
                    </Stepper.Step>

                    <Stepper.Step label="Final step" description="Third step">
                        <Center pt={10} >
                        <Image src="" alt="Placeholder" />
                        </Center>
                    </Stepper.Step>

                    <Stepper.Completed>
                        <Center pt={10} >
                        <Image src="https://cdn.pixabay.com/photo/2022/07/04/01/58/hook-7300191_1280.png" alt="Checkmark" />
                        </Center>
                    </Stepper.Completed>

                </Stepper>

                {active<3 ?
                <Group justify="center"  pt={20} miw="10vw">
                <Button variant="default" onClick={prevStep}>Back</Button>
                <Button onClick={nextStep}>Next step</Button>
                </Group>
                :
                <h2>You're all set.</h2>
                }
            </Stack>
        </Center>
        </Container>
    );
}

export default Landing;