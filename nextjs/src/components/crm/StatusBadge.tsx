import { Badge } from '@/components/ui/badge';

const statusColors: Record<string, string> = {
    available: 'bg-green-100 text-green-800 border-green-300',
    reserved: 'bg-blue-100 text-blue-800 border-blue-300',
    contacted: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    meeting_set: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    converted: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    lost: 'bg-gray-100 text-gray-800 border-gray-300',
    released: 'bg-gray-100 text-gray-600 border-gray-300',
    active: 'bg-blue-100 text-blue-800 border-blue-300',
    sold: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    cancelled: 'bg-red-100 text-red-800 border-red-300',
    blocked: 'bg-gray-100 text-gray-600 border-gray-300',
    sin_abono: 'bg-amber-100 text-amber-800 border-amber-300',
    inactive: 'bg-gray-100 text-gray-500 border-gray-300',
};

export function StatusBadge({ status }: { status: string | null }) {
    if (!status) return <Badge variant="outline">-</Badge>;
    const className = statusColors[status] ?? '';
    const label = status.replace(/_/g, ' ');
    return <Badge variant="outline" className={className}>{label}</Badge>;
}
