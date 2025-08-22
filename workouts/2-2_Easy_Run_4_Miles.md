# Easy Run – 4 Miles (Block 2, Week 2, Tuesday)
**Date:** August 19, 2025

## Warm-up
- [Easy Jog](../exercises/easy_jog.md) – 5 min
- [Leg Swings](../exercises/leg_swings.md) – 10/side

## Conditioning
- [Easy Run (Easy Jog)](../exercises/easy_jog.md) – 4 miles at easy conversational pace (RPE 4–5/10)

## Accessory/Core
- [Strides](../exercises/strides.md) (optional): 4 × 20 sec fast-but-relaxed, full walk-back

## Cooldown/Recovery
- [Brisk Walk](../exercises/brisk_walk.md) – 5 min
- [Calf Stretch](../exercises/calf_stretch.md) – 60 sec

Cues: Soft surface if possible, quick cadence (170–180), relaxed shoulders, pain-free pacing.

All exercises are linked to detail pages.

```json session-structure
{
	"version": "1",
	"title": "Easy Run – 4 Miles",
	"date": "2025-08-19",
	"block": 2,
	"week": 2,
		"sections": [
			{
				"type": "Warm-up",
				"title": "Warm-Up",
				"items": [
					{ "kind": "exercise", "name": "Easy Jog", "link": "../exercises/easy_jog.md", "prescription": { "timeSeconds": 300 } },
					{ "kind": "exercise", "name": "Leg Swings", "link": "../exercises/leg_swings.md", "prescription": { "reps": 10 } }
				]
			},
		{
			"type": "Conditioning",
			"title": "Main",
			"items": [
				{ "kind": "exercise", "name": "Easy Run", "link": "../exercises/easy_jog.md", "prescription": { "distanceMiles": 4, "rpe": 4.5 } }
			]
		},
		{
			"type": "Accessory/Core",
			"title": "Optional Strides",
			"items": [
				{ "kind": "exercise", "name": "Strides", "link": "../exercises/strides.md", "prescription": { "sets": 4, "timeSeconds": 20 } }
			]
		},
			{
				"type": "Cooldown/Recovery",
				"title": "Cooldown",
				"items": [
					{ "kind": "exercise", "name": "Brisk Walk", "link": "../exercises/brisk_walk.md", "prescription": { "timeSeconds": 300 } },
					{ "kind": "exercise", "name": "Calf Stretch", "link": "../exercises/calf_stretch.md", "prescription": { "holdSeconds": 60 } }
				]
			}
	]
}
```
