import { MarketDetail } from "../../../../components/markets/MarketsViews";

export default async function MarketSeriesPage({
  params,
}: {
  params: Promise<{ seriesId: string }>;
}) {
  const { seriesId } = await params;
  return <MarketDetail seriesId={seriesId} />;
}
