import { VerifyView } from '../../../../../components/verify/VerifyView';
import { fetchVerify } from '../../../../../lib/api';
import { normalizeInput } from '@veazen/crypto/format';

// GS1 Digital Link compatible route /01/{GTIN}/21/{serial} (§1.5).
// The serial alone resolves the code; the GTIN path segment exists for
// standards compatibility of printed QR URLs.
export const dynamic = 'force-dynamic';

interface Gs1PageProps {
  params: Promise<{ gtin: string; serial: string }>;
  searchParams: Promise<{ sig?: string }>;
}

export default async function Gs1VerifyPage({ params, searchParams }: Gs1PageProps) {
  const { serial } = await params;
  const { sig } = await searchParams;
  const data = await fetchVerify(normalizeInput(decodeURIComponent(serial)), sig);
  return <VerifyView serialRaw={serial} data={data} />;
}
