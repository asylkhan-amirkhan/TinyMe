/** Include native selects and details; ignore controls hidden in closed disclosures. */
export function focusableIn(root:HTMLElement):HTMLElement[]{
 return Array.from(root.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[tabindex="0"]')).filter(el=>el.tabIndex>=0&&el.getClientRects().length>0&&!el.closest('[hidden],[inert]'));
}
export function containTab(event:{key:string;shiftKey:boolean;preventDefault:()=>void},root:HTMLElement){
 if(event.key!=='Tab')return;
 const nodes=focusableIn(root),first=nodes[0],last=nodes.at(-1);
 if(!first){event.preventDefault();root.focus();return;}
 if(event.shiftKey&&(document.activeElement===first||!root.contains(document.activeElement))){event.preventDefault();last?.focus();}
 else if(!event.shiftKey&&(document.activeElement===last||!root.contains(document.activeElement))){event.preventDefault();first.focus();}
}
