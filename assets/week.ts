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
   * Filter workouts to current week
   */
  const filterCurrentWeek = (workouts: WorkoutFile[]): WorkoutFile[] => {
    const { start, end } = getCurrentWeekBounds();
    
    return workouts.filter(w => {
      if (!w.date) return false;
      const workoutDate = parseDate(w.date);
      if (!workoutDate) return false;
      return workoutDate >= start && workoutDate <= end;
    }).sort((a, b) => {
      // Sort by date ascending (earliest first)
      if (!a.date || !b.date) return 0;
      return a.date.localeCompare(b.date);
    });
  };

  /**
   * Render the week view
   */
  const renderWeekView = (workouts: WorkoutFile[]): void => {
    const { start, end } = getCurrentWeekBounds();
    const startFormatted = formatDateReadable(start);
    const endFormatted = formatDateReadable(end);
    
    const weekInfoEl = document.querySelector('.current-week-info')!;
    weekInfoEl.textContent = `${startFormatted} - ${endFormatted}`;

    // Create a map of workouts by date
    const workoutsByDate = new Map<string, WorkoutFile>();
    for (const workout of workouts) {
      if (workout.date) {
        workoutsByDate.set(workout.date, workout);
      }
    }

    // Generate grid of 7 cards (one for each day of the week)
    let html = '<div class="workout-grid">';
    const today = formatDate(new Date());
    
    // Loop through all 7 days of the week (Sunday to Saturday)
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      const dateStr = formatDate(currentDate);
      const dayName = getDayName(currentDate);
      const isToday = today === dateStr;
      const workout = workoutsByDate.get(dateStr);

      if (workout) {
        // Workout card
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
        html += `<a href="index.html?file=workouts/${encodeURIComponent(workout.filename)}" class="workout-grid-card__title">${workout.title}</a>`;
        if (workout.block && workout.week) {
          html += `<div class="workout-grid-card__meta">Block ${workout.block}, Week ${workout.week}</div>`;
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
