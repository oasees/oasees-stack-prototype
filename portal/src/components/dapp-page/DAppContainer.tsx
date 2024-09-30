import { useEffect, useState } from 'react';
import '@mantine/core/styles.css'
import '@mantine/dropzone/styles.css';
import { Button, Card, Center, SimpleGrid } from '@mantine/core';
import axios from 'axios';
import DApp from './DApp';


async function hitDApp(action:string){

    const config = {
      headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',

      },
      data: {},
      params: {
      }
    }

    try{
    const response = await axios.get(`http://10.160.1.225:8000/${action}`,config);

    }catch(error){
        console.error(error);
    }
    return 

  }


const ipfs_get = async (ipfs_hash:string) => {
  const response = await axios.post(`http://${process.env.REACT_APP_IPFS_HOST}/api/v0/cat?arg=` + ipfs_hash);
  return response; 
}

interface DAppProps{
  json:any
}


function DAppContainer({json}:DAppProps) {
  const marketplaceMonitor = json.marketplace.connect(json.callProvider);

  const [dapps, setDapps] = useState<string[]>([]);
  const [activeDApp, setActiveDApp] = useState(-1);
  const [dappInfos, setDappInfos] = useState<any[]>([]);

  const [deviceEndpoint,setDeviceEndpoint] = useState('');

  useEffect(()=>{
    const getDAppHashes = async () => {
      try{
        let dapp_pages = [];
        let dapp_infos = [];
        const available_daos = await marketplaceMonitor.getJoinedDaos({from: json.account});
        for (const dao of available_daos){
          // const dao_content_hash = await json.nft.tokenURI(dao[1]);
          // const content = (await ipfs_get(dao_content_hash)).data;
          // const name = content.dapp_info.NAME;
          // const description = content.dapp_info.DESCRIPTION;


          // const dapp_page = (await ipfs_get(content.dapp)).data;

          // dapp_pages.push(dapp_page);
          // dapp_infos.push({name:name, description:description})
          const cluster_config_hash = await json.nft.tokenURI(dao[5]);
          const config = (await ipfs_get(cluster_config_hash)).data;
          const ip = (config.clusters[0].cluster.server).split(":")[1].substring(2);
          console.log(ip);

          if (dao.hasCluster){
            const cluster_config_hash = await json.nft.tokenURI(dao[5]);
            const config = (await ipfs_get(cluster_config_hash)).data;
            const ip = (config.clusters[0].cluster.server).split(":")[1].substring(2);

            const cluster_info = (await ipfs_get(dao.desc_uri)).data;
            const app_name = cluster_info.dao_app_name;

            const endpoint = `http://${ip}:32000`
            dapp_pages.push(endpoint);
            dapp_infos.push({name:cluster_info.dao_name, description:cluster_info.dao_desc})
          }
        }

        setDapps(dapp_pages);
        setDappInfos(dapp_infos);

      } catch(error){
          console.error('Error loading contracts: ', error);
      }
    }

    getDAppHashes();
  },[])

  useEffect(()=>{
    const getDevice = async() => {
      try{
        const available_devices = await marketplaceMonitor.getMyDevices({from: json.account});
        if(available_devices.length>0){
          const device = available_devices[0];

          const content_hash = await json.nft.tokenURI(device[1]);
          const content = (await ipfs_get(content_hash)).data;
          setDeviceEndpoint(content.device_endpoint);
        }
      } catch (error) {
        console.error(error);
      }
    }

    getDevice();
  },[])

  const play = () => {
    hitDApp("play");
  }

  const record = () => {
    hitDApp("record");
  }

  const dapp_cards = dapps.map((dapp,index)=>(
    <Card shadow="sm" padding="lg" radius="md" withBorder ta="center" key={index}>
      <h3>{dappInfos[index].name}</h3>
      <h4>{dappInfos[index].description}</h4>
      <Button color="orange" onClick={()=>setActiveDApp(index)}>Show DApp</Button>
    </Card>
  ))

  const handleClose = () => {
    setActiveDApp(-1);
  }


  const pageContent = () => {
    if(activeDApp<0){
      return( 
        <SimpleGrid cols={{base:1, sm:2, md:3, lg:4}}>
          {dapp_cards}
        </SimpleGrid>
      );
    }
    else{
      return <DApp dapp_endpoint={dapps[activeDApp]} closeFunction={handleClose} device_endpoint={deviceEndpoint}/>
    }
  }

  return (
    <>
      <Center pt={20}>DApps</Center>
      {pageContent()}
    </>
  );
}

export default DAppContainer;