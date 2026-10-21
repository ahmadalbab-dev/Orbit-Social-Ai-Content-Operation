export type SocialProvider="facebook"|"instagram"|"threads"|"tiktok";
/** Only official consent hosts may be opened from the server's start response. */
export function socialOAuthAuthorization(raw:unknown,provider:SocialProvider):string {
 const invalid=()=>Error("The account connection could not be opened. Refresh its status and try again.");
 if(typeof raw!=="string"||raw.length>8192)throw invalid();
 let url:URL;
 try{url=new URL(raw);}catch{throw invalid();}
 const hosts=provider==="tiktok"?["www.tiktok.com"]:provider==="threads"?["threads.com","www.threads.com"]:["facebook.com","www.facebook.com"];
 if(url.protocol!=="https:"||!hosts.includes(url.hostname)||url.port||url.username||url.password||url.hash)throw invalid();
 return url.href;
}
