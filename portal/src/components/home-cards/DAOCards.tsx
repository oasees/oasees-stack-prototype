import { Button, Card, CardSection, Center, Flex, Image, Stack, Text } from "@mantine/core";

interface DAOCardProps{
    elements: any[];
    setActiveModal(name:number): void;
}

const DAOCards = ({elements,setActiveModal}:DAOCardProps) => {
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) =>{
        event.preventDefault();
        const button: HTMLButtonElement = event.currentTarget;

        setActiveModal(Number(button.value));
    };

    const dao_cards = elements.map((dao,index)=>(
        <div key={index}>
        {dao.hasDaoLogic &&
                <Card  withBorder className="DAOCard" key={index} h={280} w={{base:180, sm:220}} onClick={()=>setActiveModal(index+1)}>
                    <CardSection >
                        <Center>
                        <Image src="./images/dao_icon.png" w="auto" mah={140} alt="DAO icon"/>
                        </Center>
                    </CardSection>
                    <Stack align="center">
                        <Text fw={600}>{dao.dao_name}</Text>
                        <Text>Members : <b>{dao.members.length}</b></Text>
                        <Button color='orange' radius={50} maw={100} onClick={handleClick} value={index+1}>View</Button>
                    </Stack>
                </Card>
        }
        </div>
    ))

    return(
        <Flex wrap="wrap" align="center" justify="center" gap={20} maw={1000}>
            {dao_cards}
        </Flex>
    )

}


export default DAOCards;