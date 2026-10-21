import { socialOAuthCallback } from '../../callback';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function GET(request: Request, context: {params:Promise<{provider:string}>}) {
  return socialOAuthCallback(request,(await context.params).provider);
}
