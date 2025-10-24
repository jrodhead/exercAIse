#!/usr/bin/env python3
"""
Replace hardcoded hex colors with CSS custom properties in styles.css
"""

import re

# Color mappings from hex to CSS variable
COLOR_MAP = {
    # Gray scale
    '#f8fafc': 'var(--color-gray-50)',
    '#f1f5f9': 'var(--color-gray-100)',
    '#e5e7eb': 'var(--color-gray-200)',
    '#d1d5db': 'var(--color-gray-300)',
    '#9ca3af': 'var(--color-gray-400)',
    '#6b7280': 'var(--color-gray-500)',
    '#4b5563': 'var(--color-gray-600)',
    '#374151': 'var(--color-gray-700)',
    '#1f2937': 'var(--color-gray-800)',
    '#111827': 'var(--color-gray-900)',
    
    # Primary/Blue
    '#2563eb': 'var(--color-primary)',
    '#1d4ed8': 'var(--color-primary-dark)',
    '#1e40af': 'var(--color-primary-darker)',
    '#93c5fd': 'var(--color-primary-light)',
    
    # Brand purple
    '#667eea': 'var(--color-brand-purple)',
    '#764ba2': 'var(--color-brand-purple-dark)',
    
    # Success/Green
    '#059669': 'var(--color-success)',
    '#047857': 'var(--color-success-dark)',
    '#065f46': 'var(--color-success-darker)',
    '#d1fae5': 'var(--color-success-light)',
    '#a7f3d0': 'var(--color-success-lighter)',
    '#10b981': 'var(--color-success-border)',
    
    # Warning/Yellow/Orange
    '#f59e0b': 'var(--color-warning)',
    '#92400e': 'var(--color-warning-dark)',
    '#fef3c7': 'var(--color-warning-light)',
    '#fde68a': 'var(--color-warning-lighter)',
    '#ffe69c': 'var(--color-warning-border)',
    '#fff3cd': 'var(--color-warning-bg)',
    '#5f4b00': 'var(--color-warning-text)',
    
    # Error/Red
    '#dc2626': 'var(--color-error)',
    '#b91c1c': 'var(--color-error-dark)',
    '#991b1b': 'var(--color-error-darker)',
    '#fee2e2': 'var(--color-error-light)',
    '#fecaca': 'var(--color-error-lighter)',
    '#ef4444': 'var(--color-error-border)',
    
    # Common colors
    '#fff': 'var(--color-white)',
    '#ffffff': 'var(--color-white)',
    'white': 'var(--color-bg-primary)',
    '#000': 'var(--color-black)',
    '#000000': 'var(--color-black)',
    
    # Links
    '#0b57d0': 'var(--color-link)',
    '#0a5be1': 'var(--color-link-hover)',
    '#0849b9': 'var(--color-link-active)',
    '#6a35d4': 'var(--color-link-visited)',
    '#1a73e8': 'var(--color-link-action)',
    
    # Borders
    '#eee': 'var(--color-border)',
    '#eeeeee': 'var(--color-border)',
    '#f3f4f6': 'var(--color-border-light)',
    '#e4e4e4': 'var(--color-border-medium)',
    '#dadce0': 'var(--color-border-dark)',
    
    # Backgrounds
    '#f8f9fa': 'var(--color-bg-secondary)',
    '#f0f4f9': 'var(--color-bg-hover)',
    '#e8eaed': 'var(--color-bg-muted)',
    '#eef1f5': 'var(--color-bg-light)',
    
    # Text colors
    '#666': 'var(--color-text-light)',
    '#666666': 'var(--color-text-light)',
    '#222': 'var(--color-text-dark)',
    '#222222': 'var(--color-text-dark)',
    '#333': 'var(--color-text-medium)',
    '#333333': 'var(--color-text-medium)',
    '#444': 'var(--color-text-detail)',
    '#444444': 'var(--color-text-detail)',
    '#555': 'var(--color-text-hint)',
    '#555555': 'var(--color-text-hint)',
    
    # Dark mode specific (to handle later)
    '#0d0e11': 'var(--color-dark-bg)',
    '#e6e8ec': 'var(--color-dark-text)',
    '#14161a': 'var(--color-dark-surface)',
    '#2a2d33': 'var(--color-dark-border)',
    '#aeb5bf': 'var(--color-dark-text-muted)',
    '#3a2f00': 'var(--color-dark-warning-bg)',
    '#f3e5ab': 'var(--color-dark-warning-text)',
    '#5a4a00': 'var(--color-dark-warning-border)',
}

def replace_colors(css_content):
    """Replace hex colors with CSS variables"""
    # Sort by length (longest first) to avoid partial replacements
    sorted_colors = sorted(COLOR_MAP.items(), key=lambda x: len(x[0]), reverse=True)
    
    for hex_color, css_var in sorted_colors:
        # Case-insensitive replacement
        pattern = re.compile(re.escape(hex_color), re.IGNORECASE)
        css_content = pattern.sub(css_var, css_content)
    
    return css_content

def main():
    css_file = '/Users/jared/Desktop/exercAIse/assets/styles.css'
    
    with open(css_file, 'r') as f:
        content = f.read()
    
    updated_content = replace_colors(content)
    
    with open(css_file, 'w') as f:
        f.write(updated_content)
    
    print(f"✅ Replaced colors in {css_file}")

if __name__ == '__main__':
    main()
