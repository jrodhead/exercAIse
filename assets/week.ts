/*
  Week view for exercAIse: Display sessions for the current week (Sunday-Saturday)
*/

(() => {
  const statusEl = document.getElementById('status')!;
  const weekContent = document.getElementById('week-content')!;
  const weekInfoEl = document.querySelector('.current-week-info')!;

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
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()]!;
  };

  /**
   * Format date as "Day, Month Date" (e.g., "Monday, October 28")
   */
  const formatDateReadable = (date: Date): string => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    const dayName = getDayName(date);
    const month = months[date.getMonth()];
    const day = date.getDate();
    return `${dayName}, ${month} ${day}`;
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
    
    weekInfoEl.innerHTML = `<p>Week of ${startFormatted} through ${endFormatted}</p>`;

    if (workouts.length === 0) {
      weekContent.innerHTML = '<p class="form-hint">No sessions scheduled for this week.</p>';
      return;
    }

    let html = '<div class="week-sessions">';
    
    // Group by date
    const grouped = new Map<string, WorkoutFile[]>();
    for (const workout of workouts) {
      if (!grouped.has(workout.date)) {
        grouped.set(workout.date, []);
      }
      grouped.get(workout.date)!.push(workout);
    }

    // Render each day
    for (const [dateStr, dayWorkouts] of grouped) {
      const date = parseDate(dateStr);
      if (!date) continue;

      const isToday = formatDate(new Date()) === dateStr;
      const dayClass = isToday ? 'day-group today' : 'day-group';
      
      html += `<div class="${dayClass}">`;
      html += `<h3>${formatDateReadable(date)}${isToday ? ' <span class="badge">Today</span>' : ''}</h3>`;
      html += '<ul class="workout-list">';
      
      for (const workout of dayWorkouts) {
        let meta = '';
        if (workout.block && workout.week) {
          meta = ` <span class="muted">– Block ${workout.block}, Week ${workout.week}</span>`;
        }
        html += `<li><a href="index.html?file=workouts/${encodeURIComponent(workout.filename)}">${workout.title}${meta}</a></li>`;
      }
      
      html += '</ul></div>';
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
