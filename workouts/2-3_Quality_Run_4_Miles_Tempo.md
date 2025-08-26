# Quality Run – 4 Miles (Tempo) – Block 2, Week 3 (Saturday)
**Date:** August 30, 2025

## Warm-up
- [Brisk Walk](../exercises/brisk_walk.md): 5 minutes
- [Easy Jog](../exercises/easy_jog.md): 5–10 minutes
- [Strides](../exercises/strides.md): 4 x 15–20 sec with full walk-back recovery

## Main Set
- 4 miles total with 15–20 minutes at tempo (RPE 7–8) in the middle.  
  Options:  
  - Continuous: 15–20 min steady at tempo, remainder easy.  
  - Intervals: 2 x 8–10 min tempo, 2–3 min easy jog between.

Cues:
- Tall posture, slight forward lean from ankles.
- Quick cadence, smooth breath (in 3–4 steps, out 3–4 steps).
- Keep tempo “comfortably hard,” not all-out; finish feeling you could do 2–3 more minutes.

## Cooldown
- [Brisk Walk](../exercises/brisk_walk.md): 5–10 minutes easy
- [Calf Stretch (Wall or Step)](../exercises/calf_stretch_wall_or_step.md): 45–60 sec/side
- [Standing Quad Stretch](../exercises/standing_quad_stretch.md): 45–60 sec/side
- [Seated Spinal Twist](../exercises/seated_spinal_twist.md): 45–60 sec/side
- [Forward Fold](../exercises/forward_fold.md): 60 sec relaxed

```json session-structure
{
  "version": "1",
  "title": "Quality Run – 4 Miles (Tempo)",
  "date": "2025-08-30",
  "block": 2,
  "week": 3,
  "sections": [
    {"type": "Warm-up", "title": "Warm-up", "items": [
      {"kind": "exercise", "name": "Brisk Walk", "link": "../exercises/brisk_walk.md", "prescription": {"timeSeconds": 300}},
      {"kind": "exercise", "name": "Easy Jog", "link": "../exercises/easy_jog.md", "prescription": {"timeSeconds": 600}},
      {"kind": "exercise", "name": "Strides", "link": "../exercises/strides.md", "prescription": {"sets": 4, "timeSeconds": 20, "restSeconds": 60}}
    ]},
    {"type": "Main Set", "title": "Main Set", "items": [
      {"kind": "run", "name": "Quality Run ", "prescription": {"distanceMiles": 4, "tempoMinutes": "15–20", "intensity": "RPE 7–8"}}
    ]},
    {"type": "Cooldown", "title": "Cooldown", "items": [
      {"kind": "exercise", "name": "Brisk Walk", "link": "../exercises/brisk_walk.md", "prescription": {"timeSeconds": 600}},
      {"kind": "exercise", "name": "Calf Stretch (Wall or Step)", "link": "../exercises/calf_stretch_wall_or_step.md", "prescription": {"holdSeconds": 60}},
      {"kind": "exercise", "name": "Standing Quad Stretch", "link": "../exercises/standing_quad_stretch.md", "prescription": {"holdSeconds": 60}},
      {"kind": "exercise", "name": "Seated Spinal Twist", "link": "../exercises/seated_spinal_twist.md", "prescription": {"holdSeconds": 60}},
      {"kind": "exercise", "name": "Forward Fold", "link": "../exercises/forward_fold.md", "prescription": {"holdSeconds": 60}}
    ]}
  ]
}
```
