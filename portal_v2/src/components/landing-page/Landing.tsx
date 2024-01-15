import './Landing.css'
import {Image, AspectRatio, Box, Button, Center, Stack, rem, Stepper, Group, Container, LoadingOverlay, Loader } from '@mantine/core';
import { useContext, useState } from 'react';
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
    const [visible,setVisible] = useState(false)

    const connectToMetaMask = async () =>{
        setVisible(true);
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

        const account = accounts[0]

        const provider = new ethers.BrowserProvider(window.ethereum);

        const signer = await provider.getSigner();

        const resp = await axios.get(`http://${process.env.REACT_APP_INFRA_HOST}/ipfs_portal_contracts`, {});
        const market_contracts_info = resp.data.portal_contracts;

        const account_payload = { user: account };
        const user_exists = await axios.post(`http://${process.env.REACT_APP_INFRA_HOST}/user_exists`, account_payload);

        var jupyter_url = "";

        if(!user_exists.data.exists){
            const newUserResponse = await axios.post(`http://${process.env.REACT_APP_INFRA_HOST}/new_user`, account_payload);
            jupyter_url = newUserResponse.data.jupyter_url;
            
        }else{
            jupyter_url = user_exists.data.jupyter_url;
        }

        const marketplace = new ethers.Contract(
            market_contracts_info.marketplace_address, 
            market_contracts_info.marketplace_abi, 
            await signer)

        const nft = new ethers.Contract(
            market_contracts_info.nft_address,
            market_contracts_info.nft_abi,
            await signer)

        setVisible(false);
        setInfo({account:account,provider:provider,marketplace:marketplace,nft:nft,jupyter_url:jupyter_url});
        setIsConnected(true);
    }

    return(
        <Container bg="var(--mantine-color-gray-light)" mah="100%" maw="100%" h="100vh" pos='relative'>
        <LoadingOverlay visible={visible} zIndex={1000} overlayProps={{ radius: "lg", blur: 2 }} loaderProps={{children:<Stack align='center'><Loader color='blue'/>Loading...</Stack>}} />

            <Center>
            <Stack align='center' maw="14vw" >
                        <Image src="./images/oasees-logo.png" alt="Oasees logo"/>

                        <Button color='orange' miw={100} w="15vw" mih={40} onClick={connectToMetaMask}>Connect</Button>

                
                <Stepper active={active} onStepClick={setActive} pt={30} miw={600} mih={20}>

                    <Stepper.Step label="First step" description="Connect to Metamask" >
                        <Center pt={10} >
                            <Image src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="Metamask logo" />
                        </Center>
                    </Stepper.Step>

                    <Stepper.Step label="Second step" description="Second step">
                        <Center pt={10} >
                        <Image src="https://download.logo.wine/logo/Python_(programming_language)/Python_(programming_language)-Logo.wine.png" alt="Python logo" />
                        </Center>
                    </Stepper.Step>

                    <Stepper.Step label="Final step" description="Third step">
                        <Center pt={10} >
                        <Image src="" alt="Placeholder" />
                        </Center>
                    </Stepper.Step>

                    <Stepper.Completed>
                        <Center pt={10} >
                        <Image src="https://img.freepik.com/premium-vector/you-win-lettering-pop-art-text-banner_185004-60.jpg?w=2000" alt="Metamask logo" />
                        </Center>
                    </Stepper.Completed>

                </Stepper>

                {active<3 ?
                <Group justify="center"  pt={20} miw="10vw">
                <Button variant="default" onClick={prevStep}>Back</Button>
                <Button onClick={nextStep}>Next step</Button>
                </Group>
                :
                <h1></h1>
                }
            </Stack>
        </Center>
        </Container>
    );
}

export default Landing;