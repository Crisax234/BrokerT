export function formatCLP(value: number | null | undefined): string {
    if (value == null) return '-';
    return '$' + value.toLocaleString('es-CL');
}

export function formatUF(value: number | null | undefined): string {
    if (value == null) return '-';
    return 'UF ' + value.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
