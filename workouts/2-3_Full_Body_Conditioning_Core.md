# Full-Body Conditioning & Core – Block 2, Week 3 (Friday)
**Date:** August 29, 2025

## Warm-up
- [Jumping Jacks](../exercises/jumping_jacks.json): 30–40 sec
- [Loaded March](../exercises/loaded_march.json): 20 steps (light ruck or DBs)
- [World’s Greatest Stretch](../exercises/worlds_greatest_stretch.json): 4/side

## Conditioning (Main Work) – 3 Rounds
- [Dumbbell Thruster](../exercises/dumbbell_thruster.json): 10–12 reps @ 27.5 lb per hand  
- [Renegade Row](../exercises/renegade_row.json): 6–8/side @ 27.5 lb per hand  
- [Step-Up](../exercises/step_up.json): 10/leg (knee-height step) @ 20 lb per hand  
- [Farmer Carry](../exercises/farmer_carry.json): 40–50 sec @ 40 lb per hand  
- Rest 60–75 sec between rounds

## Accessory/Core – 3 Rounds
- [Weighted Deadbug](../exercises/weighted_deadbug.json): 8/side (slow 2–1–2)
- [Russian Twist](../exercises/russian_twist.json): 20 taps (10/side)
- [Plank Shoulder Tap](../exercises/plank_shoulder_tap.json): 20 taps (10/side)

## Cooldown/Recovery
- [Child’s Pose](../exercises/childs_pose.json): 1–2 min
- [Thread the Needle](../exercises/thread_the_needle.json): 45–60 sec/side
- [Seated Forward Fold](../exercises/seated_forward_fold.json): 1 min

Notes: Pinned loads based on Week 2 (thruster/row at 25 lb per hand). Small bump to 27.5 lb per hand this week. Keep quality high, not a race; scale down if joints feel cranky.

```json session-structure
{
  "version": "1",
  "title": "Full-Body Conditioning & Core",
  "date": "2025-08-29",
  "block": 2,
  "week": 3,
  "sections": [
    {"type": "Warm-up", "title": "Warm-up", "items": [
      {"kind": "exercise", "name": "Jumping Jacks", "link": "../exercises/jumping_jacks.md", "prescription": {"timeSeconds": 40}},
      {"kind": "exercise", "name": "Loaded March", "link": "../exercises/loaded_march.md", "prescription": {"reps": 20}},
      {"kind": "exercise", "name": "World’s Greatest Stretch", "link": "../exercises/worlds_greatest_stretch.md", "prescription": {"reps": 4}}
    ]},
    {"type": "Conditioning", "title": "Conditioning (Main Work)", "items": [
  {"kind": "exercise", "name": "Dumbbell Thruster", "link": "../exercises/dumbbell_thruster.md", "prescription": {"sets": 3, "reps": "10–12", "weight": "27.5 lb per hand", "restSeconds": 60}},
  {"kind": "exercise", "name": "Renegade Row", "link": "../exercises/renegade_row.md", "prescription": {"sets": 3, "reps": "6–8/side", "weight": "27.5 lb per hand"}},
  {"kind": "exercise", "name": "Step-Up", "link": "../exercises/step_up.md", "prescription": {"sets": 3, "reps": "10/leg", "weight": "20 lb per hand"}},
  {"kind": "exercise", "name": "Farmer Carry", "link": "../exercises/farmer_carry.md", "prescription": {"sets": 3, "timeSeconds": 45, "weight": "40 lb per hand", "restSeconds": 60}}
    ]},
    {"type": "Accessory/Core", "title": "Accessory/Core", "items": [
      {"kind": "exercise", "name": "Weighted Deadbug", "link": "../exercises/weighted_deadbug.md", "prescription": {"sets": 3, "reps": "8/side"}},
      {"kind": "exercise", "name": "Russian Twist", "link": "../exercises/russian_twist.md", "prescription": {"sets": 3, "reps": "20 taps"}},
      {"kind": "exercise", "name": "Plank Shoulder Tap", "link": "../exercises/plank_shoulder_tap.md", "prescription": {"sets": 3, "reps": "20 taps"}}
    ]},
    {"type": "Cooldown/Recovery", "title": "Cooldown/Recovery", "items": [
      {"kind": "exercise", "name": "Child’s Pose", "link": "../exercises/childs_pose.md", "prescription": {"timeSeconds": 90}},
      {"kind": "exercise", "name": "Thread the Needle", "link": "../exercises/thread_the_needle.md", "prescription": {"holdSeconds": 45}},
      {"kind": "exercise", "name": "Seated Forward Fold", "link": "../exercises/seated_forward_fold.md", "prescription": {"holdSeconds": 60}}
    ]}
  ]
}
```
