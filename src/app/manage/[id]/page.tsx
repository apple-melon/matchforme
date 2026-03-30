import { ManageClient } from "./ManageClient";

type PageProps = { params: Promise<{ id: string }> };

export default async function ManagePage({ params }: PageProps) {
  const { id } = await params;
  return <ManageClient tournamentId={id} />;
}
