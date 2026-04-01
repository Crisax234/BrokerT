import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    subtitle?: string;
}

export function EmptyState({ icon: Icon, title, subtitle }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-secondary-100 flex items-center justify-center mb-3">
                <Icon className="h-6 w-6 text-secondary-400" />
            </div>
            <p className="text-sm font-medium text-secondary-700">{title}</p>
            {subtitle && (
                <p className="text-xs text-secondary-400 mt-1 max-w-[240px]">{subtitle}</p>
            )}
        </div>
    );
}
