import { NextResponse } from "next/server";

const DEFAULT_MYSHOP_URL = "https://malaysia.4life.com/corp/shop/all";

export function GET() {
  const destination = process.env.MYSHOP_URL ?? DEFAULT_MYSHOP_URL;
  return NextResponse.redirect(destination, 307);
}
