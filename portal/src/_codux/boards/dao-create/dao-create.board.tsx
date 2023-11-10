import { createBoard } from '@wixc3/react-board';
import { DaoCreate } from '../../../components/dao-create/dao-create';

export default createBoard({
    name: 'DaoGovernance',
    Board: () => <DaoCreate account={undefined} daoStorageHash='' />
});
