import {handleSession} from './handler';
export const dynamic='force-dynamic';
export const maxDuration=30;
export const POST=(request:Request)=>handleSession(request);
export const DELETE=(request:Request)=>handleSession(request);
