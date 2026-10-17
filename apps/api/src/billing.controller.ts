import { Body, Controller, Get, Headers, HttpCode, Post, Req } from "@nestjs/common";
import { BillingService } from "./billing.service";
import { Public, type RequestIdentity } from "./security";

@Controller("billing")
export class BillingController {
  constructor(private readonly billing: BillingService) {}
  @Get("status") status(@Req() req: { identity: RequestIdentity }) { return this.billing.status(req.identity); }
  @Post("checkout") checkout(@Req() req: { identity: RequestIdentity }, @Body() body: unknown) { return this.billing.checkout(req.identity, body); }
  @Post("portal") portal(@Req() req: { identity: RequestIdentity }) { return this.billing.portal(req.identity); }
  @Public() @HttpCode(200) @Post("webhook") webhook(@Req() req: { rawBody?: Buffer }, @Headers("stripe-signature") signature?: string) { return this.billing.webhook(req.rawBody, signature); }
}
