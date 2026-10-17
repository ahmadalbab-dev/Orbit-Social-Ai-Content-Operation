import type { Metadata } from "next";
import Home from "../orbit/page-client";

export const metadata: Metadata = {
  title: "Orbit v1 design preview",
  robots: { index: false, follow: false },
};

/** No demo identity, token or remote data. Server operations still require sign-in. */
export default function PreviewPage() {
  return <Home workspaceId="" preview />;
}
