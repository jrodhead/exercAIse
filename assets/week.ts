/*
  Week view for exercAIse: Display sessions for the current week (Sunday-Saturday)
*/

(() => {
  const statusEl = document.getElementById('status')!;
  const weekContent = document.getElementById('week-content')!;

  interface WorkoutFile {
    filename: string;
    title: string;
    date: string;
    block: number | null;
    week: number | null;
  }

  const status = (msg: string, opts: { important?: boolean } = {}): void => {
    const isImportant = !!opts.important;
    if (!msg) {
      statusEl.innerHTML = '';
      statusEl.style.display = 'none';
      return;
    }
    if (!isImportant) {
      statusEl.innerHTML = msg;
      statusEl.style.display = 'none';
      return;
    }
    statusEl.innerHTML = msg;
    statusEl.style.display = 'block';
  };

  const fetchJSON = async (path: string): Promise<any> => {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${path}`);
    }
    return response.json();
  };

  const fetchText = async (path: string): Promise<string> => {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${path}`);
    }
    return response.text();
  };

  /**
   * Get the start (Sunday) and end (Saturday) of the current week
   */
  const getCurrentWeekBounds = (): { start: Date; end: Date } => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Calculate Sunday of current week
    const start = new Date(now);
    start.setDate(now.getDate() - dayOfWeek);
    start.setHours(0, 0, 0, 0);
    
    // Calculate Saturday of current week
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
  };

  /**
   * Format a date as YYYY-MM-DD
   */
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  /**
   * Parse date string in YYYY-MM-DD format
   */
  const parseDate = (dateStr: string): Date | null => {
    try {
      const parts = dateStr.split('-');
      if (parts.length !== 3) return null;
      const year = parseInt(parts[0]!, 10);
      const month = parseInt(parts[1]!, 10) - 1; // JS months are 0-indexed
      const day = parseInt(parts[2]!, 10);
      return new Date(year, month, day);
    } catch (e) {
      return null;
    }
  };

  /**
   * Get day name from date
   */
  const getDayName = (date: Date): string => {
    const days = ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'];
    return days[date.getDay()]!;
  };

  /**
   * Format date as "Month Day, Year" (e.g., "October 28, 2025")
   */
  const formatDateReadable = (date: Date): string => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  };

  /**
   * Load workout manifest and fetch metadata for each workout
   */
  const loadWorkouts = async (): Promise<WorkoutFile[]> => {
    const manifestText = await fetchText('workouts/manifest.txt');
    const lines = manifestText.split('\n').filter(line => 
      line.trim() && line.match(/\.json$/i)
    );

    const workouts: WorkoutFile[] = [];
    
    for (const line of lines) {
      const filepath = line.trim();
      const filename = filepath.replace(/^workouts\//, '');
      
      try {
        const data = await fetchJSON(`workouts/${filename}`);
        workouts.push({
          filename,
          title: data.title || filename.replace(/\.json$/, '').replace(/_/g, ' '),
          date: data.date || '',
          block: data.block || null,
          week: data.week || null
        });
      } catch (e) {
        console.warn(`Failed to load metadata for ${filename}:`, e);
        // Add without metadata
        workouts.push({
          filename,
          title: filename.replace(/\.json$/, '').replace(/_/g, ' '),
          date: '',
          block: null,
          week: null
        });
      }
    }

    return workouts;
  };

  /**
   * Filter workouts to current week and group by date
   */
  const filterCurrentWeek = (workouts: WorkoutFile[]): Map<string, WorkoutFile[]> => {
    const { start, end } = getCurrentWeekBounds();
    const workoutsByDate = new Map<string, WorkoutFile[]>();
    
    for (const workout of workouts) {
      if (!workout.date) continue;
      const workoutDate = parseDate(workout.date);
      if (!workoutDate) continue;
      if (workoutDate >= start && workoutDate <= end) {
        const dateStr = workout.date;
        if (!workoutsByDate.has(dateStr)) {
          workoutsByDate.set(dateStr, []);
        }
        workoutsByDate.get(dateStr)!.push(workout);
      }
    }
    
    return workoutsByDate;
  };

  /**
   * Get weekly context summary based on current block/week
   */
  const getWeeklyContext = (workoutsByDate: Map<string, WorkoutFile[]>): { block: number | null; week: number | null; summary: string } | null => {
    // Find the most common block/week from this week's workouts
    const allWorkouts = Array.from(workoutsByDate.values()).flat();
    if (allWorkouts.length === 0) return null;
    
    const firstWorkout = allWorkouts[0];
    const block = firstWorkout?.block || null;
    const week = firstWorkout?.week || null;
    
    if (!block || !week) return null;

    // Define context summaries for each block/week
    const contextMap: Record<string, string> = {
      '5-1': 'Week 1 baseline: Establishing loads and rep ranges for hypertrophy focus. RPE 7-8, building mind-muscle connection.',
      '5-2': 'Week 2 chest specialization hybrid: 4 sessions (M/Tu/Th/F) with 2×/week chest frequency. Testing morning training + basketball logistics. Progressive overload on all lifts from Week 1.',
      '5-3': 'Week 3 peak: Progressive overload continues across all muscle groups. Target top of rep ranges or increase loads. Maintain 2×/week chest frequency.',
      '5-4': 'Week 4 deload: Reduce loads 15-20%, maintain rep ranges, RPE 5-7. Focus on movement quality and recovery before Block 6.'
    };

    const key = `${block}-${week}`;
    const summary = contextMap[key] || `Block ${block}, Week ${week}: Continue progressive overload and maintain training consistency.`;
    
    return { block, week, summary };
  };

  /**
   * Render the week view
   */
  const renderWeekView = (workoutsByDate: Map<string, WorkoutFile[]>): void => {
    const { start, end } = getCurrentWeekBounds();
    const startFormatted = formatDateReadable(start);
    const endFormatted = formatDateReadable(end);
    
    const weekInfoEl = document.querySelector('.current-week-info')!;
    weekInfoEl.textContent = `${startFormatted} - ${endFormatted}`;

    // Generate weekly context summary
    let html = '';
    const context = getWeeklyContext(workoutsByDate);
    if (context) {
      html += '<div class="weekly-context">';
      html += `<h3 class="weekly-context__title">Block ${context.block}, Week ${context.week}</h3>`;
      html += `<p class="weekly-context__summary">${context.summary}</p>`;
      html += '</div>';
    }

    // Generate grid of 7 cards (one for each day of the week)
    html += '<div class="workout-grid">';
    const today = formatDate(new Date());
    
    // Loop through all 7 days of the week (Sunday to Saturday)
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      const dateStr = formatDate(currentDate);
      const dayName = getDayName(currentDate);
      const isToday = today === dateStr;
      const workouts = workoutsByDate.get(dateStr);

      if (workouts && workouts.length > 0) {
        // Workout card(s)
        const cardClass = isToday ? 'workout-grid-card workout-grid-card--today' : 'workout-grid-card';
        
        html += `<div class="${cardClass}">`;
        if (isToday) {
          html += `<span class="today-badge">Today</span>`;
        }
        html += `<div class="workout-grid-card__header">`;
        html += `<div class="workout-grid-card__day">${dayName}</div>`;
        html += `<div class="workout-grid-card__date">${currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>`;
        html += `</div>`;
        html += `<div class="workout-grid-card__body">`;
        
        // Display all workouts for this day
        for (const workout of workouts) {
          html += `<a href="index.html?file=workouts/${encodeURIComponent(workout.filename)}" class="workout-grid-card__title">${workout.title}</a>`;
        }
        
        if (workouts[0]?.block && workouts[0]?.week) {
          html += `<div class="workout-grid-card__meta">Block ${workouts[0].block}, Week ${workouts[0].week}</div>`;
        }
        html += `</div>`;
        html += `</div>`;
      } else {
        // Placeholder card
        const cardClass = isToday ? 'workout-grid-card workout-grid-card--placeholder workout-grid-card--today' : 'workout-grid-card workout-grid-card--placeholder';
        
        html += `<div class="${cardClass}">`;
        if (isToday) {
          html += `<span class="today-badge">Today</span>`;
        }
        html += `<div class="workout-grid-card__header">`;
        html += `<div class="workout-grid-card__day">${dayName}</div>`;
        html += `<div class="workout-grid-card__date">${currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>`;
        html += `</div>`;
        html += `<div class="workout-grid-card__body">`;
        html += `Rest Day`;
        html += `</div>`;
        html += `</div>`;
      }
    }
    
    html += '</div>';
    weekContent.innerHTML = html;
  };

  /**
   * Main load function
   */
  const load = async (): Promise<void> => {
    try {
      status('Loading sessions...');
      const allWorkouts = await loadWorkouts();
      const weekWorkouts = filterCurrentWeek(allWorkouts);
      renderWeekView(weekWorkouts);
      status('');
    } catch (err) {
      const error = err as Error;
      status(`Error loading sessions: ${error.message}`, { important: true });
      weekContent.innerHTML = '<p class="error">Failed to load sessions. Please try again.</p>';
    }
  };

  // Start loading when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
})();
