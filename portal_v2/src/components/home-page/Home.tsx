import { Button, Flex, Grid, Paper, ScrollArea, Stack } from "@mantine/core";
import DAOModal from "../dao-modal/DAOModal";
import DAOTable from "../tables/dao-table/DAOTable";
import DeviceTable from "../tables/device-table/DeviceTable";
import ItemTable from "../tables/item-table/ItemTable";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import axios from "axios";

interface HomeProps{
    json:any
}

async function IpfsGet(_ipfs_hash:string){

    const config = {
      headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',

      },
      data: {},
      params: {
        "ipfs_hash": _ipfs_hash
      }
    }

    const response = await axios.get(`http://${process.env.REACT_APP_INFRA_HOST}/ipfs_fetch`,config);


    return response.data.content;

  }

const Home = ({json}:HomeProps) => {

    const [activeModal,setActiveModal] = useState('');

    const [myDevices,setMyDevices] = useState([
        ['1','Drone1','10.5.42.1','FirstDAO'],
        ['2','Drone2','10.6.43.2','FirstDAO'],
        ['3','Drone3','10.5.21.3','--'],
        ['4','Drone4','168.24.1.2','QQQQQQQ']
    ])

    const itemTableElements = [
    ['Alg1','0.002','--'],
    ['Alg2','0.003','--'],
    ['Alg3','0.0006','Drone3'],
    ['Alg4','0.00001','Drone4']
    ];

    const [myAlgorithms,setMyAlgorithms] = useState<string[][]>([]);
    const [myDaos, setMyDaos] = useState<string[]>([]);

    useEffect(()=>{
        const populateAlgorithms = async () => {
            try{
                const nft_items = [];
                const available_nfts = await json.marketplace.getMyNfts();

                for (const item of available_nfts) {
                    const price = ethers.formatEther(item[4]);
                    const meta_hash = item[5];
                    
                    const content = JSON.parse(await IpfsGet(meta_hash));

                    nft_items.push([
                        content.title,
                        price,
                        '--',
                    ])
                }

                setMyAlgorithms(nft_items);
            } catch(error){
                console.error('Error loading contracts: ', error);
            }
        }
        
        populateAlgorithms();
    },[])

    const daoTableElements = ['FirstDAO','SecondDAO','Item', 'QQQQQQQ', 'f', 'g','h'];

    useEffect(()=>{
        const populateDaos = async() => {
            try{
                const daos = [];
                const available_daos = await json.marketplace.getJoinedDaos();

                for (const dao of available_daos){
                    const meta_hash = dao[2];
                    const content = await IpfsGet(meta_hash);

                    daos.push(content.dao_name)
                }
                setMyDaos(daos);
            } catch(error){
                console.error('Error loading contracts: ', error);
            }
        }

        populateDaos();
    },[])

    useEffect(()=>{
        const populateDevices = async () => {
            try{
                const devices = [];
                const available_devices = await json.marketplace.getMyDevices();

                var i=1
                for (const device of available_devices) {
                    const price = ethers.formatEther(device[4]);
                    const meta_hash = device[5];
                    const content_hash = await json.nft.tokenURI(device[7])
                    
                    const content = await IpfsGet(content_hash);
                    const metadata = JSON.parse(await IpfsGet(meta_hash));

                    console.log(content);
                    console.log(metadata);

                    devices.push([
                        i,
                        metadata.title,
                        content.device_endpoint,
                        '--',
                    ])
                    i++;
                }

                setMyDevices(devices);
            } catch(error){
                console.error('Error loading contracts: ', error);
            }
        }
        
        populateDevices();
    },[])




    const closeModal = () =>{
        setActiveModal('')
    };

    const addDeviceToDao = (v:number) => {
        const updated = myDevices.map((device,index)=>{
          if(index!=v) return device;
          else return [device[0],device[1], device[2], activeModal];
        });
        setMyDevices(updated);
    };

    const availableDevices = () => {
        let avDevices:string[][] = []; 
    
        myDevices.map((device)=> {
            if(device[3]=='--') avDevices.push(device);
        })

        return avDevices;
    };
    
    const modalDevices = () => {
        let mDevices: string[][] = [];
        myDevices.map((device)=> {
            if(device[3]==activeModal) mDevices.push(device);
        })
        return mDevices;
    };


    return(
        <>
        {activeModal!='' && <DAOModal
        currentDAO={activeModal}
        availableDevices={availableDevices()}
        joinedDevices={modalDevices()} 
        addDeviceToDao={addDeviceToDao}
        closeModal={closeModal}/>}

        <Grid gutter="md" justify='space-evenly' miw={900}  >
        <Grid.Col span={12}>My OASEES</Grid.Col>


        <Grid.Col span={4}>
            <Stack>
            Joined DAOs
            <Paper shadow='xl' radius='xs' withBorder>
                <ScrollArea h={208}>
                <DAOTable elements={myDaos} setActiveModal={setActiveModal}/>
                </ScrollArea>
            </Paper>
            </Stack>
        </Grid.Col>


        <Grid.Col span={4}>
            <Stack >
            Purchased Items
            <Paper shadow='xl' radius='xs' withBorder>
                <ScrollArea h={207}>
                <ItemTable elements={myAlgorithms}/>
                </ScrollArea>
            </Paper>
            </Stack>
        </Grid.Col>


        <Grid.Col span={5}>
            <Stack>
            Devices
            <Paper shadow='xl' radius='xs' withBorder>
                <ScrollArea h={207}>
                    <DeviceTable elements={myDevices}/>
                </ScrollArea>
            </Paper>
            </Stack>
        </Grid.Col>

        </Grid>
        </>
    );
}


export default Home;