"use strict";
(() => {
    const statusEl = document.getElementById('status');
    const weekContent = document.getElementById('week-content');
    const status = (msg, opts = {}) => {
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
    const fetchJSON = async (path) => {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} for ${path}`);
        }
        return response.json();
    };
    const fetchText = async (path) => {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} for ${path}`);
        }
        return response.text();
    };
    const getCurrentWeekBounds = () => {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const start = new Date(now);
        start.setDate(now.getDate() - dayOfWeek);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    };
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const parseDate = (dateStr) => {
        try {
            const parts = dateStr.split('-');
            if (parts.length !== 3)
                return null;
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            return new Date(year, month, day);
        }
        catch (e) {
            return null;
        }
    };
    const getDayName = (date) => {
        const days = ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'];
        return days[date.getDay()];
    };
    const formatDateReadable = (date) => {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        const month = months[date.getMonth()];
        const day = date.getDate();
        const year = date.getFullYear();
        return `${month} ${day}, ${year}`;
    };
    const loadWorkouts = async () => {
        const manifestText = await fetchText('workouts/manifest.txt');
        const lines = manifestText.split('\n').filter(line => line.trim() && line.match(/\.json$/i));
        const workouts = [];
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
            }
            catch (e) {
                console.warn(`Failed to load metadata for ${filename}:`, e);
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
    const filterCurrentWeek = (workouts) => {
        const { start, end } = getCurrentWeekBounds();
        return workouts.filter(w => {
            if (!w.date)
                return false;
            const workoutDate = parseDate(w.date);
            if (!workoutDate)
                return false;
            return workoutDate >= start && workoutDate <= end;
        }).sort((a, b) => {
            if (!a.date || !b.date)
                return 0;
            return a.date.localeCompare(b.date);
        });
    };
    const renderWeekView = (workouts) => {
        const { start, end } = getCurrentWeekBounds();
        const startFormatted = formatDateReadable(start);
        const endFormatted = formatDateReadable(end);
        const weekInfoEl = document.querySelector('.current-week-info');
        weekInfoEl.textContent = `${startFormatted} - ${endFormatted}`;
        const workoutsByDate = new Map();
        for (const workout of workouts) {
            if (workout.date) {
                workoutsByDate.set(workout.date, workout);
            }
        }
        let html = '<div class="workout-grid">';
        const today = formatDate(new Date());
        for (let i = 0; i < 7; i++) {
            const currentDate = new Date(start);
            currentDate.setDate(start.getDate() + i);
            const dateStr = formatDate(currentDate);
            const dayName = getDayName(currentDate);
            const isToday = today === dateStr;
            const workout = workoutsByDate.get(dateStr);
            if (workout) {
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
            }
            else {
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
    const load = async () => {
        try {
            status('Loading sessions...');
            const allWorkouts = await loadWorkouts();
            const weekWorkouts = filterCurrentWeek(allWorkouts);
            renderWeekView(weekWorkouts);
            status('');
        }
        catch (err) {
            const error = err;
            status(`Error loading sessions: ${error.message}`, { important: true });
            weekContent.innerHTML = '<p class="error">Failed to load sessions. Please try again.</p>';
        }
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', load);
    }
    else {
        load();
    }
})();
//# sourceMappingURL=week.js.map