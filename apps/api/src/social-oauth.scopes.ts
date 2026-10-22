export function socialConnectionScopes(provider:string):string[] {
 return provider==='tiktok'?['user.info.basic']:provider==='threads'?['threads_basic']:provider==='instagram'?['pages_show_list','pages_read_engagement','instagram_basic']:provider==='facebook'?['pages_show_list','pages_read_engagement']:[];
}
