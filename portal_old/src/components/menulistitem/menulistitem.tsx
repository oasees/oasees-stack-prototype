import styles from './menulistitem.module.scss';
import classNames from 'classnames';

export interface MenulistitemProps {
    className?: string;
}

/**
 * This component was created using Codux's Default new component template.
 * To create custom component templates, see https://help.codux.com/kb/en/article/kb16522
 */
export const Menulistitem = ({ className }: MenulistitemProps) => {
    return (
        <div className={classNames(styles.root, className)}>
            <img
                src="https://wixplosives.github.io/codux-assets-storage/add-panel/image-placeholder.jpg"
                alt=""
                className={styles.menuitemimg}
            />
            Text
        </div>
    );
};
