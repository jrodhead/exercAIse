/**
 * Progress Report Renderer Module
 * Renders progress report JSON to DOM following BEM naming and architectural patterns
 * 
 * Matches schema: schemas/progress-report.schema.json
 * 
 * Public API:
 * - ExercAIse.ProgressReportRenderer.renderReport(report, container)
 */

// ============================================================================
// Implementation
// ============================================================================

(window as any).ExercAIse = (window as any).ExercAIse || {};

(window as any).ExercAIse.ProgressReportRenderer = (() => {
  'use strict';

  // ============================================================================
  // Utility Functions
  // ============================================================================

  const createElement = (tag: string, className?: string): HTMLElement => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    return el;
  };

  // ============================================================================
  // Validation
  // ============================================================================

  const validateReport = (report: any): { valid: boolean; errors: Array<{ field: string; message: string }> } => {
    const errors: Array<{ field: string; message: string }> = [];

    if (!report) {
      errors.push({ field: 'root', message: 'Report object is null or undefined' });
      return { valid: false, errors };
    }

    if (!report.version || typeof report.version !== 'string') {
      errors.push({ field: 'version', message: 'Version is missing or not a string' });
    }

    if (!report.metadata) {
      errors.push({ field: 'metadata', message: 'Metadata is missing' });
    }

    if (!report.sections || !Array.isArray(report.sections)) {
      errors.push({ field: 'sections', message: 'Sections is missing or not an array' });
    }

    return { valid: errors.length === 0, errors };
  };

  // ============================================================================
  // Table Renderers
  // ============================================================================

  const renderExerciseTable = (table: any): HTMLElement => {
    const tableEl = createElement('table', 'report-table report-table--exercise');
    
    // Header
    const thead = createElement('thead');
    const headerRow = createElement('tr');
    for (const col of table.columns) {
      const th = createElement('th', 'report-table__header');
      th.textContent = col;
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    tableEl.appendChild(thead);

    // Body
    const tbody = createElement('tbody');
    for (const row of table.rows) {
      const tr = createElement('tr', 'report-table__row');
      
      for (const col of table.columns) {
        const td = createElement('td', 'report-table__cell');
        
        // Map column name to row field (camelCase)
        const fieldMap: Record<string, string> = {
          'Exercise': 'exercise',
          'First Session': 'firstSession',
          'Peak Performance': 'peakPerformance',
          'Volume Change': 'volumeChange',
          'Sessions': 'sessions'
        };
        
        const field = fieldMap[col] || col.toLowerCase().replace(/\s+/g, '');
        let value = row[field];
        
        // Handle sentiment styling for volumeChange
        if (field === 'volumeChange' && row.volumeChangeSentiment) {
          const span = createElement('span', `sentiment--${row.volumeChangeSentiment}`);
          span.textContent = value || '—';
          td.appendChild(span);
        } else {
          td.textContent = value || '—';
        }
        
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    tableEl.appendChild(tbody);

    return tableEl;
  };

  const renderGenericTable = (table: any): HTMLElement => {
    const tableEl = createElement('table', 'report-table report-table--generic');
    
    // Header
    const thead = createElement('thead');
    const headerRow = createElement('tr');
    for (const col of table.columns) {
      const th = createElement('th', 'report-table__header');
      th.textContent = col;
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    tableEl.appendChild(thead);

    // Body
    const tbody = createElement('tbody');
    for (const row of table.rows) {
      const tr = createElement('tr', 'report-table__row');
      for (const value of row) {
        const td = createElement('td', 'report-table__cell');
        td.textContent = String(value);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    tableEl.appendChild(tbody);

    return tableEl;
  };

  // ============================================================================
  // Section Renderers
  // ============================================================================

  const renderStrengthAnalysisSection = (section: any): HTMLElement => {
    const wrapper = createElement('section', 'report-section report-section--strength-analysis');

    // Section title
    const title = createElement('h3', 'report-section__title');
    title.textContent = section.title;
    wrapper.appendChild(title);

    // Render subsections
    if (section.subsections && Array.isArray(section.subsections)) {
      for (const subsection of section.subsections) {
        const subsectionDiv = createElement('div', 'report-subsection');
        
        // Subtitle
        const subtitle = createElement('h4', 'report-subsection__title');
        subtitle.textContent = subsection.subtitle;
        subsectionDiv.appendChild(subtitle);

        // Table
        if (subsection.table) {
          const tableEl = subsection.table.type === 'exercise-progression'
            ? renderExerciseTable(subsection.table)
            : renderGenericTable(subsection.table);
          subsectionDiv.appendChild(tableEl);
        }

        // Observation
        if (subsection.observation) {
          const obs = createElement('p', 'report-subsection__observation');
          obs.textContent = subsection.observation;
          subsectionDiv.appendChild(obs);
        }

        wrapper.appendChild(subsectionDiv);
      }
    }

    return wrapper;
  };

  const renderTableSection = (section: any): HTMLElement => {
    const wrapper = createElement('section', 'report-section report-section--table');

    // Title
    const title = createElement('h3', 'report-section__title');
    title.textContent = section.title;
    wrapper.appendChild(title);

    // Subtitle (optional)
    if (section.subtitle) {
      const subtitle = createElement('h4', 'report-section__subtitle');
      subtitle.textContent = section.subtitle;
      wrapper.appendChild(subtitle);
    }

    // Table
    if (section.table) {
      const tableEl = section.table.type === 'exercise-progression'
        ? renderExerciseTable(section.table)
        : renderGenericTable(section.table);
      wrapper.appendChild(tableEl);
    }

    // Summary (optional)
    if (section.summary) {
      const summary = createElement('p', 'report-section__summary');
      summary.textContent = section.summary;
      wrapper.appendChild(summary);
    }

    return wrapper;
  };

  const renderTextSection = (section: any): HTMLElement => {
    const wrapper = createElement('section', 'report-section report-section--text');

    // Title
    const title = createElement('h3', 'report-section__title');
    title.textContent = section.title;
    wrapper.appendChild(title);

    // Content array
    if (section.content && Array.isArray(section.content)) {
      const contentDiv = createElement('div', 'report-section__content');
      
      for (const item of section.content) {
        if (item.type === 'paragraph') {
          const p = createElement('p');
          p.textContent = item.text;
          contentDiv.appendChild(p);
        } else if (item.type === 'list') {
          const listEl = item.ordered ? createElement('ol') : createElement('ul');
          listEl.className = 'report-section__list';
          
          for (const listItem of item.items) {
            const li = createElement('li');
            li.textContent = listItem;
            listEl.appendChild(li);
          }
          contentDiv.appendChild(listEl);
        }
      }
      
      wrapper.appendChild(contentDiv);
    }

    return wrapper;
  };

  const renderHighlightBoxSection = (section: any): HTMLElement => {
    const sentiment = section.sentiment || 'neutral';
    const box = createElement('div', `report-highlight-box report-highlight-box--${sentiment}`);

    // Title
    const title = createElement('h4', 'report-highlight-box__title');
    title.textContent = section.title;
    box.appendChild(title);

    // Content array
    if (section.content && Array.isArray(section.content)) {
      const contentDiv = createElement('div', 'report-highlight-box__content');
      
      for (const item of section.content) {
        if (item.type === 'paragraph') {
          const p = createElement('p');
          p.textContent = item.text;
          contentDiv.appendChild(p);
        } else if (item.type === 'list') {
          const listEl = item.ordered ? createElement('ol') : createElement('ul');
          
          for (const listItem of item.items) {
            const li = createElement('li');
            li.textContent = listItem;
            listEl.appendChild(li);
          }
          contentDiv.appendChild(listEl);
        }
      }
      
      box.appendChild(contentDiv);
    }

    return box;
  };

  const renderKpiGridSection = (section: any): HTMLElement => {
    const wrapper = createElement('section', 'report-section report-section--kpi-grid');

    // Title
    const title = createElement('h3', 'report-section__title');
    title.textContent = section.title;
    wrapper.appendChild(title);

    // KPI Grid
    const grid = createElement('div', 'report-kpi-grid');
    
    for (const kpi of section.kpis) {
      const card = createElement('div', 'kpi-card');
      
      if (kpi.sentiment) {
        card.className += ` kpi-card--${kpi.sentiment}`;
      }
      
      const label = createElement('div', 'kpi-card__label');
      label.textContent = kpi.label;
      card.appendChild(label);
      
      const value = createElement('div', 'kpi-card__value');
      value.textContent = kpi.value;
      card.appendChild(value);
      
      grid.appendChild(card);
    }
    
    wrapper.appendChild(grid);

    return wrapper;
  };

  // ============================================================================
  // Main Renderer
  // ============================================================================

  const renderSection = (section: any, container: HTMLElement): void => {
    try {
      let sectionEl: HTMLElement;

      switch (section.type) {
        case 'strength-analysis':
          sectionEl = renderStrengthAnalysisSection(section);
          break;
        case 'table':
          sectionEl = renderTableSection(section);
          break;
        case 'text':
          sectionEl = renderTextSection(section);
          break;
        case 'highlight-box':
          sectionEl = renderHighlightBoxSection(section);
          break;
        case 'kpi-grid':
          sectionEl = renderKpiGridSection(section);
          break;
        default:
          console.warn('Unknown section type:', section.type);
          sectionEl = createElement('div', 'report-section report-section--unknown');
          sectionEl.textContent = `Unknown section type: ${section.type}`;
      }

      container.appendChild(sectionEl);
    } catch (error) {
      console.error('Error rendering section:', section.type, error);
      const errorDiv = createElement('div', 'report-section report-section--error');
      errorDiv.textContent = `Error rendering section: ${section.type}`;
      container.appendChild(errorDiv);
    }
  };

  const renderReport = (report: any, container: HTMLElement): void => {
    // Validate
    const validation = validateReport(report);
    if (!validation.valid) {
      const errorDiv = createElement('div', 'report-error');
      errorDiv.innerHTML = '<h3>Report Validation Errors</h3>';
      const ul = createElement('ul');
      for (const error of validation.errors) {
        const li = createElement('li');
        li.textContent = `${error.field}: ${error.message}`;
        ul.appendChild(li);
      }
      errorDiv.appendChild(ul);
      container.appendChild(errorDiv);
      return;
    }

    // Clear container
    container.innerHTML = '';

    // Report header
    const header = createElement('header', 'report-header');
    const headerTitle = createElement('h2', 'report-header__title');
    headerTitle.textContent = report.metadata.title;
    header.appendChild(headerTitle);

    const meta = createElement('div', 'report-meta');
    const period = report.metadata.period;
    meta.textContent = `${period.startDate} to ${period.endDate} (${period.weeks} weeks, Blocks ${period.blockRange})`;
    header.appendChild(meta);

    container.appendChild(header);

    // Summary section (grade + KPIs)
    if (report.summary) {
      const summarySection = createElement('section', 'report-summary');
      
      if (report.summary.grade) {
        const grade = createElement('div', 'report-summary__grade');
        grade.textContent = `Grade: ${report.summary.grade}`;
        summarySection.appendChild(grade);
      }

      if (report.summary.kpis && Array.isArray(report.summary.kpis)) {
        const kpiGrid = createElement('div', 'report-kpi-grid');
        
        for (const kpi of report.summary.kpis) {
          const card = createElement('div', 'kpi-card');
          
          if (kpi.sentiment) {
            card.className += ` kpi-card--${kpi.sentiment}`;
          }
          
          const label = createElement('div', 'kpi-card__label');
          label.textContent = kpi.label;
          card.appendChild(label);
          
          const value = createElement('div', 'kpi-card__value');
          value.textContent = kpi.value;
          card.appendChild(value);
          
          kpiGrid.appendChild(card);
        }
        
        summarySection.appendChild(kpiGrid);
      }

      container.appendChild(summarySection);
    }

    // Render sections
    if (report.sections && Array.isArray(report.sections)) {
      for (const section of report.sections) {
        renderSection(section, container);
      }
    }
  };

  // ============================================================================
  // Public API
  // ============================================================================

  return {
    renderReport,
    renderSection
  };
})();
