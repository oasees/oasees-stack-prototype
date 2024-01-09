import { createBoard } from '@wixc3/react-board';
import { DaoCatalogue } from '../../../components/dao-catalogue/dao-catalogue';

export default createBoard({
    name: 'DaoCatalogue',
    Board: () => <DaoCatalogue  account={undefined} signer={undefined} daoIndexerContract={undefined} daoStorageContract={undefined} nft={undefined}/>
});
