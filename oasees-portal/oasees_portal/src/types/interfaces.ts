export interface NftItem{
    desc: string;
    id: string;
    marketplace_id: string;
    price?: string;
    title: string;
    tags?: string[];
    seller?: string;
    members?: string[];
    asset_type?: string;
}