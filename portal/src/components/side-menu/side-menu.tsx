import styles from './side-menu.module.scss';
import classNames from 'classnames';

export interface SideMenuProps {
    className?: string;
    onTabClick: (tabName: string) => void;
    activeTab: string;
}

const menu_items: Array<Array<string>> = [
    ['Home', './images/home.svg'],
    ['Service Catalogue', './images/market.png'],
    ['DAO Catalogue', './images/catalogue.png'],
    ['Publish', './images/upload.png'],
    ['Notebooks', './images/tweak.png'],
    // ['Create DAO', './images/chain.png']
  ];


export const SideMenu = ({ className,onTabClick }: SideMenuProps) => {

    const handleTabClick = (tabName: string) => {
        onTabClick(tabName);
      };



    return (
        <div className={classNames(styles.root, className)}>
            <div className={styles.logodiv}>
                <img src="./images/oasees-logo.png" alt="" className={styles.logo} />
            </div>
            <span className={styles.listspan}>
                <ul className={styles.menulist}>
                    {menu_items.map((item) => (
                        <li className={styles.listItem} key={item[0]} onClick={() => handleTabClick(item[0])}>
                            <img src={item[1]} alt="" className={styles.limg} />
                            {item[0]}
                        </li>
                    ))}
                </ul>
            </span>
        </div>
    );
};
