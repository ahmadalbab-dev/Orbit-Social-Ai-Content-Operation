const malaysiaFormatter=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kuala_Lumpur",year:"numeric",month:"2-digit",day:"2-digit"});
export function malaysiaDateKey(date:Date) {
  const parts=malaysiaFormatter.formatToParts(date);
  const part=(type:string)=>parts.find(p=>p.type===type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function monthGrid(year:number,month:number) {
  const first=new Date(Date.UTC(year,month,1));
  const offset=(first.getUTCDay()+6)%7;
  return Array.from({length:42},(_,index)=>{
    const date=new Date(Date.UTC(year,month,index-offset+1));
    return {key:date.toISOString().slice(0,10),day:date.getUTCDate(),current:date.getUTCMonth()===month};
  });
}
