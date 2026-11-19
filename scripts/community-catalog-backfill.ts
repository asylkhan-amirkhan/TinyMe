// Regenerate the reviewed metadata SQL after changing the built-in catalogue.
import { writeFileSync } from 'node:fs';
import { catalog } from '../domain/model';
const sql=(s:string)=>`'${s.replaceAll("'","''")}'`;
const rows=catalog.map(p=>`(${[p.id,p.category,p.kind,p.color,`${p.name} — деталь для твоей комнаты.`].map(sql).join(',')})`).join(',\n');
writeFileSync('supabase/community-catalog-backfill.sql',`-- Run after community.sql. Existing nonempty descriptions are preserved.\nupdate public.catalog_items c set category=v.category,kind=v.kind,color=v.color,description=v.description\nfrom (values\n${rows}\n) as v(id,category,kind,color,description)\nwhere c.id=v.id and c.description='';\n`);
