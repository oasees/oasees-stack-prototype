import { Group, List, UnstyledButton } from "@mantine/core";
import './SideMenu.css'


interface SideMenuProps{
    onTabClick(v:number): void;
}


const menu_items = [
    ['Home', './images/home.svg'],
    ['Marketplace', './images/market.png'],
    ['Publish', './images/upload.png'],
    ['Notebook', './images/tweak.png']
  ];



const SideMenu = ({onTabClick}:SideMenuProps) => {

    const handleTabClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        const button: HTMLButtonElement = event.currentTarget;
        onTabClick(Number(button.value));
    };
    

    const items = menu_items.map((item,index)=> (
        <List.Item icon=' ' key={index} >
            <UnstyledButton value={index+1} onClick={handleTabClick}><Group gap="xs"><img src={item[1]}/>{item[0]}</Group></UnstyledButton>
        </List.Item>
    ));

    return (
        <List spacing={20}>
            {items}
        </List>
    );
}

export default SideMenu;