import { TournamentPublicClient } from "./TournamentPublicClient";

type PageProps = { params: Promise<{ code: string }> };

export default async function TournamentPublicPage({ params }: PageProps) {
  const { code } = await params;
  return <TournamentPublicClient code={code} />;
}
