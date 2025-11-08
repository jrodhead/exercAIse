export function isStrengthAnalysisSection(section) {
    return section.type === 'strength-analysis';
}
export function isTableSection(section) {
    return section.type === 'table';
}
export function isTextSection(section) {
    return section.type === 'text';
}
export function isHighlightBoxSection(section) {
    return section.type === 'highlight-box';
}
export function isKpiGridSection(section) {
    return section.type === 'kpi-grid';
}
export function isExerciseTable(table) {
    return table.type === 'exercise';
}
export function isGenericTable(table) {
    return table.type === 'generic';
}
export function validateProgressReport(report) {
    const errors = [];
    if (!report) {
        errors.push({ field: 'root', message: 'Report object is null or undefined' });
        return { valid: false, errors };
    }
    if (!report.version || typeof report.version !== 'string') {
        errors.push({ field: 'version', message: 'Version is missing or not a string' });
    }
    if (!report.metadata || typeof report.metadata !== 'object') {
        errors.push({ field: 'metadata', message: 'Metadata is missing or not an object' });
    }
    else {
        if (!report.metadata.title) {
            errors.push({ field: 'metadata.title', message: 'Title is required' });
        }
        if (!report.metadata.period) {
            errors.push({ field: 'metadata.period', message: 'Period is required' });
        }
        if (!report.metadata.generatedDate) {
            errors.push({ field: 'metadata.generatedDate', message: 'Generated date is required' });
        }
    }
    if (!report.sections || !Array.isArray(report.sections)) {
        errors.push({ field: 'sections', message: 'Sections is missing or not an array' });
    }
    else if (report.sections.length === 0) {
        errors.push({ field: 'sections', message: 'Sections array is empty' });
    }
    else {
        report.sections.forEach((section, index) => {
            if (!section.type) {
                errors.push({ field: `sections[${index}].type`, message: 'Section type is required' });
            }
            else {
                const validTypes = ['strength-analysis', 'table', 'text', 'highlight-box', 'kpi-grid'];
                if (!validTypes.includes(section.type)) {
                    errors.push({ field: `sections[${index}].type`, message: `Invalid section type: ${section.type}` });
                }
            }
            if (section.type === 'strength-analysis') {
                if (!section.title)
                    errors.push({ field: `sections[${index}].title`, message: 'Title is required for strength-analysis' });
                if (!section.movementPattern)
                    errors.push({ field: `sections[${index}].movementPattern`, message: 'Movement pattern is required' });
                if (!section.analysis)
                    errors.push({ field: `sections[${index}].analysis`, message: 'Analysis is required' });
            }
            if (section.type === 'table') {
                if (!section.title)
                    errors.push({ field: `sections[${index}].title`, message: 'Title is required for table' });
                if (!section.table || typeof section.table !== 'object') {
                    errors.push({ field: `sections[${index}].table`, message: 'Table object is required' });
                }
                else {
                    if (!section.table.type || !['exercise', 'generic'].includes(section.table.type)) {
                        errors.push({ field: `sections[${index}].table.type`, message: 'Table type must be "exercise" or "generic"' });
                    }
                    if (!Array.isArray(section.table.headers) || section.table.headers.length === 0) {
                        errors.push({ field: `sections[${index}].table.headers`, message: 'Table headers are required' });
                    }
                    if (!Array.isArray(section.table.rows)) {
                        errors.push({ field: `sections[${index}].table.rows`, message: 'Table rows must be an array' });
                    }
                }
            }
            if (section.type === 'text') {
                if (!section.content)
                    errors.push({ field: `sections[${index}].content`, message: 'Content is required for text section' });
            }
            if (section.type === 'highlight-box') {
                if (!section.content)
                    errors.push({ field: `sections[${index}].content`, message: 'Content is required for highlight-box' });
                if (section.variant && !['info', 'warning', 'success'].includes(section.variant)) {
                    errors.push({ field: `sections[${index}].variant`, message: 'Variant must be "info", "warning", or "success"' });
                }
            }
            if (section.type === 'kpi-grid') {
                if (!Array.isArray(section.kpis) || section.kpis.length === 0) {
                    errors.push({ field: `sections[${index}].kpis`, message: 'KPIs array is required and must not be empty' });
                }
            }
        });
    }
    return { valid: errors.length === 0, errors };
}
//# sourceMappingURL=progress-report.types.js.map