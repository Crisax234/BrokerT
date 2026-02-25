import { Badge } from '@/components/ui/badge';

export function ScoreBadge({ score }: { score: number | null }) {
    if (score == null) return <Badge variant="outline">-</Badge>;
    let className = '';
    if (score >= 80) className = 'bg-green-100 text-green-800 border-green-300';
    else if (score >= 60) className = 'bg-yellow-100 text-yellow-800 border-yellow-300';
    else if (score >= 40) className = 'bg-orange-100 text-orange-800 border-orange-300';
    else className = 'bg-red-100 text-red-800 border-red-300';

    return <Badge variant="outline" className={className}>{score}</Badge>;
}
