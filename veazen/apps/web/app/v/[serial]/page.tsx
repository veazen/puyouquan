import { VerifyView } from '../../../components/verify/VerifyView';
import { fetchVerify } from '../../../lib/api';
import { normalizeInput } from '@veazen/crypto/format';

// Consumer verify page, internal path /v/{serial} (§1.5). SSR against
// GET /api/v1/verify/:serial — no client-side data fetching.
export const dynamic = 'force-dynamic';

interface VerifyPageProps {
  params: Promise<{ serial: string }>;
  searchParams: Promise<{ sig?: string }>;
}

export default async function VerifyPage({ params, searchParams }: VerifyPageProps) {
  const { serial } = await params;
  const { sig } = await searchParams;
  const data = await fetchVerify(normalizeInput(decodeURIComponent(serial)), sig);
  return <VerifyView serialRaw={serial} data={data} />;
}
