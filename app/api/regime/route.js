import { getMarketRegime } from '@/app/lib/finnhub';

export async function GET() {
  const data = await getMarketRegime();
  return Response.json(data);
}
