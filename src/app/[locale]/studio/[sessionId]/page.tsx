import { StudioWorkspace } from '@/features/studio/components/StudioWorkspace';

export default async function StudioPage({
  params,
}: {
  params: Promise<{ locale: string; sessionId: string }>;
}) {
  const { sessionId } = await params;

  return <StudioWorkspace sessionId={sessionId} />;
}
