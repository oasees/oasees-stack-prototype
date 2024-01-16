import { createBoard } from '@wixc3/react-board';
import { SideMenu } from '../../../components/side-menu/side-menu';

export default createBoard({
    name: 'SideMenu',
    Board: () => <SideMenu onTabClick={function (tabName: string): void {
        throw new Error('Function not implemented.');
    } } activeTab={''} />
});
