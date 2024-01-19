import {Grid, Paper, ScrollArea, Stack } from "@mantine/core";
import DAOModal from "../dao-modal/DAOModal";
import DAOTable from "../tables/dao-table/DAOTable";
import DeviceTable from "../tables/device-table/DeviceTable";
import ItemTable from "../tables/item-table/ItemTable";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import axios from "axios";
import { useDisclosure } from "@mantine/hooks";

interface HomeProps{
    json:any
}

interface DAO{
    dao_name:string,
    members: string[],
}

interface Device{
    id: number,
    name: string,
    ip_address: string,
    account: string,
    dao: string
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

    const [activeModal,setActiveModal] = useState(0);

    const [myAlgorithms,setMyAlgorithms] = useState<string[][]>([]);
    const [myDaos, setMyDaos] = useState<DAO[]>([]);
    // const [myDevices,setMyDevices] = useState([
    //     ['1','Drone1','10.5.42.1','FirstDAO'],
    //     ['2','Drone2','10.6.43.2','FirstDAO'],
    //     ['3','Drone3','10.5.21.3','--'],
    //     ['4','Drone4','168.24.1.2','QQQQQQQ']
    // ])

    const [myDevices,setMyDevices] = useState<Device[]>([]);

    const [zeroDaos, setZeroDaos] = useState(false);

    const [modalUpdate,{toggle}] = useDisclosure();

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

    useEffect(()=>{
        const populateDaos = async() => {
            try{
                const daos = [];
                const available_daos = await json.marketplace.getJoinedDaos();

                for (const dao of available_daos){
                    const dao_content_hash = await json.nft.tokenURI(dao[1]);
                    const content = await IpfsGet(dao_content_hash);
                    let m = [];

                    //TEST
                    const members = await json.marketplace.getDaoMembers(dao[4])
                    for (const member of members){
                        m.push(member);
                    }

                    daos.push({...content,"marketplace_dao_id": dao[4],"members":m})
                }
                if (daos.length >0)
                    setMyDaos(daos);
                else
                    setZeroDaos(true);
            } catch(error){
                console.error('Error loading contracts: ', error);
            }
        }

        populateDaos();
    },[modalUpdate])


    useEffect(()=>{
        const populateDevices = async () => {
            try{
                const devices:Device[] = [];
                const available_devices = await json.marketplace.getMyDevices();


                var i=1
                for (const device of available_devices) {
                    const price = ethers.formatEther(device[4]);
                    const meta_hash = device[5];
                    const content_hash = await json.nft.tokenURI(device[1])
                    
                    const content = await IpfsGet(content_hash);
                    const metadata = JSON.parse(await IpfsGet(meta_hash));
                    let device_dao ='';

                    for (const dao of myDaos){
                        if(dao.members.includes(content.account)){
                            device_dao = dao.dao_name;
                            break;
                        }
                    }

                    devices.push({
                        id: i,
                        name: metadata.title,
                        ip_address: content.device_endpoint.substring(7),
                        account: content.account,
                        dao: device_dao
                    })
                    i++;
                }
                setMyDevices(devices);
            } catch(error){
                console.error('Error loading contracts: ', error);
            }
        }

        if(myDaos.length>0 || zeroDaos)
            populateDevices();

    },[myDaos, modalUpdate,zeroDaos])




    const closeModal = () =>{
        setActiveModal(0)
    };

    const availableDevices = () => {
        let avDevices:Device[] = [];

        for (var device of myDevices){
            if(!device.dao)
                avDevices.push(device);
        }

        return avDevices;
    };
    
    const modalDevices = () => {
        let mDevices: Device[] = [];
        const selectedDao = myDaos[activeModal-1]
        for (var device of myDevices){
            if(device.dao==selectedDao.dao_name)
                mDevices.push(device);
        }
        return mDevices;
    };


    return(
        <>
        {activeModal>0 && <DAOModal
        currentDAO={myDaos[activeModal-1]}
        availableDevices={availableDevices()}
        joinedDevices={modalDevices()}
        closeModal={closeModal}
        updateDevices = {toggle}
        json={json}/>}

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