#!/usr/bin/env python3
"""
Analyze performance logs and extract key metrics for training progress report.
"""

import json
import os
from datetime import datetime
from collections import defaultdict
from pathlib import Path

def parse_timestamp(filename):
    """Extract timestamp from filename."""
    # Handle both old and new formats
    if filename.startswith('2025-'):
        timestamp_str = filename.split('_')[0]
        # Try different formats
        for fmt in ['%Y-%m-%dT%H-%M-%S.%fZ', '%Y-%m-%dT%H%M%S']:
            try:
                return datetime.strptime(timestamp_str, fmt)
            except ValueError:
                continue
    return None

def analyze_logs(start_date, end_date):
    """Analyze all performance logs within date range."""
    
    performed_dir = Path(__file__).parent.parent / 'performed'
    
    # Data structures
    exercise_data = defaultdict(list)
    session_count = 0
    blocks_covered = set()
    
    # Process all JSON files
    for filename in os.listdir(performed_dir):
        if not filename.endswith('.json') or filename == 'index.json' or filename == 'README.md':
            continue
            
        timestamp = parse_timestamp(filename)
        if not timestamp:
            continue
            
        if timestamp < start_date or timestamp > end_date:
            continue
            
        # Load the log
        filepath = performed_dir / filename
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)
        except:
            continue
            
        session_count += 1
        
        # Extract block info from filename
        if '-' in filename:
            parts = filename.split('_')
            if len(parts) > 0:
                block_week = parts[0].split('T')[0] if 'T' in parts[0] else parts[0]
                if block_week and '-' in block_week:
                    blocks_covered.add(block_week.split('-')[0])
        
        # Process exercises
        exercises = data.get('exercises', {})
        for ex_key, ex_data in exercises.items():
            ex_name = ex_data.get('name', ex_key)
            sets = ex_data.get('sets', [])
            
            for s in sets:
                weight = s.get('weight', 0)
                multiplier = s.get('multiplier', 1)
                reps = s.get('reps', 0)
                rpe = s.get('rpe', None)
                distance = s.get('distanceMiles', 0)
                time_sec = s.get('timeSeconds', 0)
                
                exercise_data[ex_name].append({
                    'date': timestamp.strftime('%Y-%m-%d'),
                    'block_week': block_week if 'block_week' in locals() else 'unknown',
                    'weight': weight,
                    'multiplier': multiplier,
                    'reps': reps,
                    'rpe': rpe,
                    'distance': distance,
                    'time': time_sec,
                    'volume': weight * multiplier * reps if reps else 0
                })
    
    # Generate summary
    summary = {
        'period': f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}",
        'total_sessions': session_count,
        'blocks_covered': sorted(list(blocks_covered)),
        'exercises': {}
    }
    
    # Summarize each exercise
    for ex_name, records in exercise_data.items():
        if not records:
            continue
            
        # Sort by date
        records.sort(key=lambda x: x['date'])
        
        first = records[0]
        last = records[-1]
        
        # Find peak volume
        peak = max(records, key=lambda x: x['volume']) if records[0]['volume'] > 0 else last
        
        summary['exercises'][ex_name] = {
            'total_sessions': len(set(r['date'] for r in records)),
            'first': first,
            'last': last,
            'peak': peak,
            'all_records': records
        }
    
    return summary

if __name__ == '__main__':
    import sys
    
    # Default to 2025-08-22 to 2025-11-03
    start = datetime(2025, 8, 22)
    end = datetime(2025, 11, 3)
    
    summary = analyze_logs(start, end)
    
    # Output as JSON
    print(json.dumps(summary, indent=2))
