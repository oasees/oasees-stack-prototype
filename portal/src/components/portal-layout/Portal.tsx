import { AppShell, Image, Center, Button, Stack, Flex, ScrollArea } from "@mantine/core";
import './Portal.css'
import '../tables/Table.css'
import { useState } from "react";
import SideMenu from "../side-menu/SideMenu";
import Home from "../home-page/Home";
import Marketplace from "../marketplace-page/Marketplace";
import Publish from "../publish-page/Publish";
import Notebook from "../notebook-page/Notebook";
import DAppContainer from "../dapp-page/DAppContainer";

interface PortalProps {
  json:any;
  setIsConnected:any;
}

const Portal = ({json,setIsConnected}:PortalProps) => {

  const [pageId, setPageId] = useState(1);
  
  

  const changeCurrentPage = (v:number) => {
    setPageId(v);
  }

  const mapCurrentPage = () => {
    switch(pageId){
      case 2:
        return <Marketplace json={json}/>;
      case 3:
        return <Publish json={json}/>;
      case 4:
        return <Notebook json={json}/>;
      case 5:
        return <DAppContainer json={json}/>;
      default:
        return <Home json={json}/>;
    }
  }


  return (
    <AppShell
      navbar={{
        width: {base:190, sm:250, xl:300},
        breakpoint: '',
      }}
      padding="md"
    >

      <AppShell.Navbar p="md">
        <AppShell.Section p={20}>
            <Center>
              <Image src="./images/oasees-logo.png" alt="Oasees logo" mah={150} w="auto"/>
            </Center>
        </AppShell.Section>


        <AppShell.Section grow component={ScrollArea} pt={20}>
            <Center>
              <SideMenu currentPage={pageId} onTabClick={changeCurrentPage}/>
            </Center>
        </AppShell.Section>

      </AppShell.Navbar>


      <AppShell.Main >
        <Stack>

          <Flex justify='flex-end'>
            <Button color='orange' w={200} h={45} onClick={setIsConnected}>Disconnect</Button>
          </Flex>

          {mapCurrentPage()}

        </Stack>
      </AppShell.Main>
    </AppShell>
  );
}

export default Portal;