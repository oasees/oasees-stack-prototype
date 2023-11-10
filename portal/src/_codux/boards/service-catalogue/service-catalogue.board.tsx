import { createBoard } from '@wixc3/react-board';
import { ServiceCatalogue } from '../../../components/service-catalogue/service-catalogue';

export default createBoard({
    name: 'ServiceCatalogue',
    Board: () => <ServiceCatalogue marketplace={undefined} nft={undefined} account={undefined} showall={undefined}/>
});