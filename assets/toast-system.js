/**
 * Professional Toast Notification System
 * Usage examples for the new toast CSS classes
 */

// Toast utility function (can be added to app.js)
function showToast(message, type = 'info', duration = 4000) {
  // Create toast container if it doesn't exist
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  // Icons for different toast types
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  toast.innerHTML = `
    <div class="toast-content">
      <div class="toast-icon">${icons[type] || icons.info}</div>
      <div class="toast-message">
        <div class="toast-title">${message}</div>
      </div>
    </div>
    <button class="toast-close" onclick="hideToast(this.parentElement)">×</button>
    <div class="toast-progress"></div>
  `;

  container.appendChild(toast);

  // Show toast with animation
  setTimeout(() => toast.classList.add('show'), 10);

  // Progress bar animation
  const progress = toast.querySelector('.toast-progress');
  if (progress && duration > 0) {
    progress.style.width = '100%';
    setTimeout(() => {
      progress.style.width = '0%';
      progress.style.transition = `width ${duration}ms linear`;
    }, 50);
  }

  // Auto-hide after duration
  if (duration > 0) {
    setTimeout(() => hideToast(toast), duration);
  }

  return toast;
}

function hideToast(toast) {
  toast.classList.add('hide');
  setTimeout(() => {
    if (toast.parentElement) {
      toast.parentElement.removeChild(toast);
    }
  }, 300);
}

// Usage examples:
// showToast('Workout saved successfully!', 'success');
// showToast('Failed to save workout', 'error');
// showToast('Consider increasing weight next time', 'warning');
// showToast('Loading workout data...', 'info', 0); // No auto-hide