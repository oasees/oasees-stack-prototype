import { Group, List, UnstyledButton, Text} from "@mantine/core";
import './SideMenu.css'


interface SideMenuProps{
    currentPage: number
    onTabClick(v:number): void;
}


const menu_items = [
    ['Home', './images/home.svg'],
    ['Marketplace', './images/market.png'],
    ['Publish', './images/upload.png'],
    ['Notebook', './images/tweak.png'],
    ['DApps', './images/chain.png'],
    ['SDK Manager', './images/catalogue.png']
  ];



const SideMenu = ({currentPage, onTabClick}:SideMenuProps) => {

    const handleTabClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        const button: HTMLButtonElement = event.currentTarget;
        onTabClick(Number(button.value));
    };

    const styledTab = (text:string, index:number) => {
        if(currentPage==index)
            return <Text fw={500} c="var(--mantine-color-orange-7)">{text}</Text>
        else
            return <Text>{text}</Text>
    }
    

    const items = menu_items.map((item,index)=> (
        <List.Item key={index}>
            <UnstyledButton value={index+1} onClick={handleTabClick} w={160}>
                <Group gap="xs">
                    <img src={item[1]} alt={item[0] + "icon"}/>
                    {styledTab(item[0],index+1)}
                </Group>
            </UnstyledButton>
        </List.Item>
    ));

    return (
        <List spacing={20} w={142} listStyleType="none">
            {items}
        </List>
    );
}

export default SideMenu;