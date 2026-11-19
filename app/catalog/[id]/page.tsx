import CommunityApp from '@/features/community/community-app';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <CommunityApp view="product" id={id}/>;}
