import { Button, Table, Image} from "@mantine/core";
interface TableProps {
    elements: any[];
    setActiveModal(name:number): void;
  }



const headers = ['#','Name', 'Members'];

const DAOTable = ({elements,setActiveModal}:TableProps) => {
    
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) =>{
        event.preventDefault();
        const button: HTMLButtonElement = event.currentTarget;

        setActiveModal(Number(button.value));
    };

    const cols = headers.map((header,index)=>(
        <Table.Th key={index} className={"table_"+header}>{header}</Table.Th>
    ));

    const rows = elements.map((element,index)=>(
        <Table.Tr key={index}>
            <Table.Td>{index+1}</Table.Td>
            <Table.Td>{element.dao_name}</Table.Td>
            <Table.Td>{element.members.length}</Table.Td>
            <Table.Td align='center'>
                
                <Button color='orange' onClick={handleClick} value={index+1}>View</Button>
            </Table.Td>
        </Table.Tr>
    ));

    return(
                <Table striped={true} stripedColor="var(--mantine-color-gray-1)" stickyHeader borderColor="black">
                    <Table.Thead>
                        <Table.Tr>
                            {cols}
                            <Table.Td align='center'><Image src='./images/dao_icon.png' h={40} w="auto"/></Table.Td>
                        </Table.Tr>
                    </Table.Thead>

                    <Table.Tbody>{rows}</Table.Tbody>
                </Table>
    )
}



export default DAOTable;