# Easy Run – 4 Miles (Block 2, Week 3, Tuesday)
**Date:** August 26, 2025

## Warm-up
- [Brisk Walk](../exercises/brisk_walk.md): 5–10 min
- [Leg Swings](../exercises/leg_swings.md): 10–15 per direction/leg

## Conditioning (Main Work)
- Easy Run: 4 miles at conversational pace (RPE 4–5/10)
- Cues: Soft surface if possible, cadence ~170–180, relaxed shoulders, pain-free pacing

## Accessory/Core
- [Strides](../exercises/strides.md) (optional): 4 x 15–20 sec, full walk-back recovery

## Cooldown/Recovery
- [Brisk Walk](../exercises/brisk_walk.md): 5–10 min
- [Calf Stretch](../exercises/calf_stretch.md): 45 sec per side

```json session-structure
{
  "version": "1",
  "title": "Easy Run – 4 Miles",
  "date": "2025-08-26",
  "block": 2,
  "week": 3,
  "sections": [
    {"type": "Warm-up", "title": "Warm-Up", "items": [
      {"kind": "exercise", "name": "Brisk Walk", "link": "exercises/brisk_walk.md", "prescription": {"timeSeconds": 600}},
      {"kind": "exercise", "name": "Leg Swings", "link": "exercises/leg_swings.md", "prescription": {"reps": 15}}
    ]},
    {"type": "Conditioning", "title": "Main", "items": [
      {"kind": "note", "name": "Easy run", "prescription": {"distanceMiles": 4, "rpe": 4.5}}
    ]},
    {"type": "Accessory/Core", "title": "Strides", "items": [
      {"kind": "exercise", "name": "Strides", "link": "exercises/strides.md", "prescription": {"sets": 4, "timeSeconds": 20, "restSeconds": 60}}
    ]},
    {"type": "Cooldown/Recovery", "title": "Cooldown", "items": [
      {"kind": "exercise", "name": "Brisk Walk", "link": "exercises/brisk_walk.md", "prescription": {"timeSeconds": 600}},
      {"kind": "exercise", "name": "Calf Stretch", "link": "exercises/calf_stretch.md", "prescription": {"holdSeconds": 45}}
    ]}
  ]
}
```
