import { JoinClient } from "./JoinClient";

type PageProps = { params: Promise<{ code: string }> };

export default async function JoinPage({ params }: PageProps) {
  const { code } = await params;
  return <JoinClient code={code} />;
}
