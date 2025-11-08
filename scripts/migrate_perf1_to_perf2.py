#!/usr/bin/env python3
"""
Migration Script: perf-1 → perf-2

Converts flat performance logs (perf-1) to nested structure format (perf-2)
by reconstructing workout structure from session JSON.

Usage:
    # Migrate specific files
    python3 scripts/migrate_perf1_to_perf2.py performed/2025-11-04T133137_5-1_Chest_Triceps_Hypertrophy_perf1.json
    
    # Migrate all Block 5 Week 1 logs
    python3 scripts/migrate_perf1_to_perf2.py performed/2025-11-04T133137_5-1_*.json
    
    # Migrate all perf-1 logs (use with caution!)
    python3 scripts/migrate_perf1_to_perf2.py performed/*_perf1.json
"""

import json
import sys
import re
from pathlib import Path
from typing import Dict, List, Any, Optional


def exercise_key_from_name(name: str) -> str:
    """Convert exercise name to slug/key format."""
    # Remove parentheticals and extra whitespace
    name = re.sub(r'\([^)]*\)', '', name)
    # Convert to lowercase, replace spaces with hyphens, remove special chars
    key = name.lower().strip()
    key = re.sub(r'[^\w\s-]', '', key)
    key = re.sub(r'[-\s]+', '-', key)
    return key


def load_session_json(workout_file: str) -> Optional[Dict[str, Any]]:
    """Load session JSON from workouts directory."""
    session_path = Path(workout_file)
    if not session_path.exists():
        print(f"  ⚠️  Session not found: {workout_file}")
        return None
    
    with open(session_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def build_exercise_index(sections: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    """Build flat exercise index for fast queries."""
    index = {}
    
    for s_idx, section in enumerate(sections):
        for i_idx, item in enumerate(section.get('items', [])):
            if item['kind'] == 'exercise' and 'sets' in item:
                # Standalone exercise
                ex_key = exercise_key_from_name(item['name'])
                total_volume = sum(
                    (s.get('weight', 0) * s.get('multiplier', 1)) * s.get('reps', 0)
                    for s in item['sets']
                )
                avg_rpe = sum(s.get('rpe', 0) for s in item['sets']) / len(item['sets']) if item['sets'] else 0
                
                index[ex_key] = {
                    'name': item['name'],
                    'sectionPath': f"sections[{s_idx}].items[{i_idx}].sets[*]",
                    'totalSets': len(item['sets']),
                    'totalRounds': 0,
                    'avgRPE': round(avg_rpe, 1),
                    'totalVolume': round(total_volume, 1)
                }
            
            elif item['kind'] in ('superset', 'circuit') and 'rounds' in item:
                # Superset/circuit - index each child exercise
                for ex_idx, exercise in enumerate(item['rounds'][0]['exercises'] if item['rounds'] else []):
                    total_volume = sum(
                        (r['exercises'][ex_idx].get('weight', 0) * r['exercises'][ex_idx].get('multiplier', 1)) * 
                        r['exercises'][ex_idx].get('reps', 0)
                        for r in item['rounds'] if ex_idx < len(r['exercises'])
                    )
                    avg_rpe = sum(
                        r['exercises'][ex_idx].get('rpe', 0) 
                        for r in item['rounds'] if ex_idx < len(r['exercises'])
                    ) / len(item['rounds']) if item['rounds'] else 0
                    
                    index[exercise['key']] = {
                        'name': exercise['name'],
                        'sectionPath': f"sections[{s_idx}].items[{i_idx}].rounds[*].exercises[{ex_idx}]",
                        'totalSets': len(item['rounds']),
                        'totalRounds': len(item['rounds']),
                        'avgRPE': round(avg_rpe, 1),
                        'totalVolume': round(total_volume, 1)
                    }
    
    return index


def migrate_perf1_to_perf2(perf1_path: Path) -> Optional[Dict[str, Any]]:
    """
    Convert a perf-1 log to perf-2 format.
    
    Strategy:
    1. Load perf-1 log (flat structure)
    2. Load corresponding session JSON (nested structure)
    3. For each section in session:
       - For standalone exercises: copy sets directly
       - For supersets/circuits: group sets into rounds by set number
    4. Build exercise index
    5. Return perf-2 log
    """
    print(f"\n📄 Migrating: {perf1_path.name}")
    
    # Load perf-1 log
    with open(perf1_path, 'r', encoding='utf-8') as f:
        perf1 = json.load(f)
    
    # Validate perf-1 format
    if perf1.get('version') != 'perf-1':
        print(f"  ⚠️  Skipping: not perf-1 format (version={perf1.get('version')})")
        return None
    
    # Load session JSON
    session = load_session_json(perf1['workoutFile'])
    if not session:
        return None
    
    # Initialize perf-2 log
    perf2: Dict[str, Any] = {
        'version': 'perf-2',
        'workoutFile': perf1['workoutFile'],
        'timestamp': perf1['timestamp'],
        'sections': []
    }
    
    # Copy optional metadata
    for field in ['date', 'block', 'week', 'title', 'notes']:
        if field in perf1:
            perf2[field] = perf1[field]
        elif field in session:
            perf2[field] = session[field]
    
    # Get perf-1 exercises map
    perf1_exercises = perf1.get('exercises', {})
    
    # Process each section
    for session_section in session.get('sections', []):
        perf2_section: Dict[str, Any] = {
            'type': session_section['type'],
            'title': session_section['title'],
            'items': []
        }
        
        for session_item in session_section.get('items', []):
            if session_item['kind'] == 'exercise':
                # Standalone exercise: copy sets directly
                ex_key = exercise_key_from_name(session_item['name'])
                perf1_ex = perf1_exercises.get(ex_key)
                
                if not perf1_ex or not perf1_ex.get('sets'):
                    continue  # No performance data logged
                
                perf2_item: Dict[str, Any] = {
                    'kind': 'exercise',
                    'name': session_item['name'],
                    'sets': []
                }
                
                # Copy sets, preserving all fields
                for perf1_set in perf1_ex['sets']:
                    set_data: Dict[str, Any] = {'set': perf1_set['set']}
                    for field in ['weight', 'multiplier', 'reps', 'rpe', 'timeSeconds', 'holdSeconds', 'distanceMiles', 'tempo', 'notes']:
                        if field in perf1_set:
                            set_data[field] = perf1_set[field]
                    perf2_item['sets'].append(set_data)
                
                if 'notes' in session_item:
                    perf2_item['notes'] = session_item['notes']
                
                perf2_section['items'].append(perf2_item)
            
            elif session_item['kind'] in ('superset', 'circuit'):
                # Superset/circuit: group sets into rounds
                children = session_item.get('children', [])
                if not children:
                    continue
                
                # Get exercise keys and their perf-1 data
                child_keys = [exercise_key_from_name(child['name']) for child in children]
                child_perf1 = [perf1_exercises.get(key) for key in child_keys]
                
                # Skip if no performance data for any exercise
                if not any(child_perf1):
                    continue
                
                # Determine number of rounds (max sets across all exercises)
                num_rounds = max(
                    len(perf1_ex.get('sets', [])) for perf1_ex in child_perf1 if perf1_ex
                )
                
                if num_rounds == 0:
                    continue
                
                perf2_item: Dict[str, Any] = {
                    'kind': session_item['kind'],
                    'name': session_item['name'],
                    'rounds': []
                }
                
                if 'notes' in session_item:
                    perf2_item['notes'] = session_item['notes']
                
                # Get prescribed rest from first child (if available)
                prescribed_rest = None
                for child in children:
                    if 'prescription' in child and 'restSeconds' in child['prescription']:
                        prescribed_rest = child['prescription']['restSeconds']
                        break
                
                # Build rounds
                for round_num in range(1, num_rounds + 1):
                    round_data: Dict[str, Any] = {
                        'round': round_num,
                        'exercises': []
                    }
                    
                    if prescribed_rest:
                        round_data['prescribedRestSeconds'] = prescribed_rest
                    
                    # Add each exercise's performance for this round
                    for child_idx, (child, perf1_ex) in enumerate(zip(children, child_perf1)):
                        if not perf1_ex or not perf1_ex.get('sets'):
                            continue
                        
                        # Find set matching this round number
                        matching_set = next(
                            (s for s in perf1_ex['sets'] if s['set'] == round_num),
                            None
                        )
                        
                        if not matching_set:
                            continue
                        
                        ex_perf: Dict[str, Any] = {
                            'key': child_keys[child_idx],
                            'name': child['name']
                        }
                        
                        # Copy all performance fields
                        for field in ['weight', 'multiplier', 'reps', 'rpe', 'timeSeconds', 'holdSeconds', 'distanceMiles', 'tempo', 'notes']:
                            if field in matching_set:
                                ex_perf[field] = matching_set[field]
                        
                        round_data['exercises'].append(ex_perf)
                    
                    if round_data['exercises']:
                        perf2_item['rounds'].append(round_data)
                
                if perf2_item['rounds']:
                    perf2_section['items'].append(perf2_item)
        
        if perf2_section['items']:
            perf2['sections'].append(perf2_section)
    
    # Build exercise index
    if perf2['sections']:
        perf2['exerciseIndex'] = build_exercise_index(perf2['sections'])
    
    return perf2


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/migrate_perf1_to_perf2.py <perf1_file_pattern>")
        print("\nExamples:")
        print("  python3 scripts/migrate_perf1_to_perf2.py performed/2025-11-04T133137_5-1_Chest_Triceps_Hypertrophy_perf1.json")
        print("  python3 scripts/migrate_perf1_to_perf2.py performed/*5-1*_perf1.json  # Block 5 Week 1")
        print("  python3 scripts/migrate_perf1_to_perf2.py performed/*_perf1.json  # All perf-1 logs")
        sys.exit(1)
    
    # Collect all matching files
    import glob
    files = []
    for pattern in sys.argv[1:]:
        files.extend(Path(p) for p in glob.glob(pattern))
    
    if not files:
        print(f"❌ No files found matching pattern: {sys.argv[1:]}")
        sys.exit(1)
    
    print(f"🔍 Found {len(files)} file(s) to migrate")
    
    # Migrate each file
    success_count = 0
    skip_count = 0
    error_count = 0
    
    for perf1_path in files:
        try:
            perf2 = migrate_perf1_to_perf2(perf1_path)
            
            if not perf2:
                skip_count += 1
                continue
            
            # Generate output filename: replace _perf1.json with _perf2.json
            output_path = perf1_path.parent / perf1_path.name.replace('_perf1.json', '_perf2.json')
            
            # Write perf-2 log
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(perf2, f, indent=2, ensure_ascii=False)
            
            print(f"  ✅ Migrated → {output_path.name}")
            print(f"     • {len(perf2['sections'])} sections")
            print(f"     • {len(perf2.get('exerciseIndex', {}))} exercises in index")
            print(f"     • {sum(len(s['items']) for s in perf2['sections'])} total items")
            
            success_count += 1
        
        except Exception as e:
            print(f"  ❌ Error: {e}")
            error_count += 1
    
    # Summary
    print(f"\n{'='*60}")
    print(f"✅ Migration Complete")
    print(f"{'='*60}")
    print(f"  Migrated: {success_count}")
    print(f"  Skipped:  {skip_count}")
    print(f"  Errors:   {error_count}")
    print(f"  Total:    {len(files)}")
    
    if success_count > 0:
        print(f"\n💾 New perf-2 files saved with '_perf2.json' suffix")
        print(f"   Original perf-1 files preserved")
    
    if error_count > 0:
        sys.exit(1)


if __name__ == '__main__':
    main()
