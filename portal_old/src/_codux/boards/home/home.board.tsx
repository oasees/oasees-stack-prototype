import { createBoard } from '@wixc3/react-board';
import { Home } from '../../../components/home/home';

export default createBoard({
    name: 'Home',
    Board: () => <Home marketplace={undefined} nft={undefined} account={undefined} signer={undefined} showall={undefined} daoStorageContract={undefined}/>
});