"use strict";
(() => {
    const statusEl = document.getElementById('status');
    const weekContent = document.getElementById('week-content');
    const weekInfoEl = document.querySelector('.current-week-info');
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
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[date.getDay()];
    };
    const formatDateReadable = (date) => {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        const dayName = getDayName(date);
        const month = months[date.getMonth()];
        const day = date.getDate();
        return `${dayName}, ${month} ${day}`;
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
        weekInfoEl.innerHTML = `<p>Week of ${startFormatted} through ${endFormatted}</p>`;
        if (workouts.length === 0) {
            weekContent.innerHTML = '<p class="form-hint">No sessions scheduled for this week.</p>';
            return;
        }
        let html = '<div class="week-sessions">';
        const grouped = new Map();
        for (const workout of workouts) {
            if (!grouped.has(workout.date)) {
                grouped.set(workout.date, []);
            }
            grouped.get(workout.date).push(workout);
        }
        for (const [dateStr, dayWorkouts] of grouped) {
            const date = parseDate(dateStr);
            if (!date)
                continue;
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