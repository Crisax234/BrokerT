import { Badge } from '@/components/ui/badge';

const qualityColors: Record<string, string> = {
    premium: 'bg-purple-100 text-purple-800 border-purple-300',
    hot: 'bg-red-100 text-red-800 border-red-300',
    warm: 'bg-orange-100 text-orange-800 border-orange-300',
    cold: 'bg-blue-100 text-blue-800 border-blue-300',
};

export function QualityBadge({ tier }: { tier: string | null }) {
    if (!tier) return <Badge variant="outline">-</Badge>;
    const className = qualityColors[tier] ?? '';
    return <Badge variant="outline" className={className}>{tier}</Badge>;
}
