// Header component loader
(function() {
  'use strict';
  
  // Load header component
  function loadHeader() {
    const placeholder = document.getElementById('header-placeholder');
    if (!placeholder) {
      console.warn('Header placeholder not found');
      createFallbackHeader();
      return;
    }
    
    fetch('components/header.html')
      .then(function(response) {
        if (!response.ok) throw new Error('Failed to load header');
        return response.text();
      })
      .then(function(html) {
        placeholder.outerHTML = html;
        setActiveNav();
      })
      .catch(function(error) {
        console.error('Error loading header:', error);
        createFallbackHeader();
      });
  }
  
  // Set active navigation link based on current page
  function setActiveNav() {
    const path = window.location.pathname;
    const page = path.split('/').pop() || 'index.html';
    
    // Remove any existing active class
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => link.classList.remove('active'));
    
    // Add active class to current page
    if (page === 'week.html') {
      const weekLink = document.getElementById('nav-week');
      if (weekLink) weekLink.classList.add('active');
    } else if (page === 'rpe-guide.html') {
      const rpeLink = document.querySelector('a[href="rpe-guide.html"]');
      if (rpeLink) rpeLink.classList.add('active');
    } else if (page === 'exercise.html') {
      // Exercise pages don't have a specific nav item
    } else {
      // Default to home for index.html and other pages
      const homeLink = document.getElementById('nav-home');
      if (homeLink) homeLink.classList.add('active');
    }
  }
  
  // Fallback header if component loading fails
  function createFallbackHeader() {
    const header = document.createElement('header');
    header.className = 'site-header';
    header.innerHTML = `
      <h1>exercAIse</h1>
      <nav>
        <a href="index.html" id="nav-home">Home</a>
        <a href="week.html" id="nav-week">This Week</a>
        <a href="index.html?view=workouts" id="nav-workouts">Workouts</a>
        <a href="index.html?view=history" id="nav-history">History</a>
        <a href="rpe-guide.html">RPE Guide</a>
        <a href="https://github.com/jrodhead/exercAIse#readme" target="_blank" rel="noopener">README</a>
      </nav>
    `;
    
    const body = document.body;
    if (body && body.firstChild) {
      body.insertBefore(header, body.firstChild);
    }
    setActiveNav();
  }
  
  // Load header when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadHeader);
  } else {
    loadHeader();
  }
})();
