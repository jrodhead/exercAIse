# Quality Run – 4 Miles (Tempo) (Block 2, Week 2, Saturday)
**Date:** August 23, 2025

## Warm-up
- [Easy Jog](../exercises/easy_jog.md) – 10 min
- [Leg Swings](../exercises/leg_swings.md) – 10/side

## Conditioning
- [Tempo Mile](../exercises/tempo_mile.md): 2 × 1 mile at tempo (RPE 7–8/10); 3–4 min easy jog between
- Remaining distance easy to total ~4 miles (including rest jogs)

## Accessory/Core
- [Strides](../exercises/strides.md) (optional): 4 × 20 sec

## Cooldown/Recovery
- [Brisk Walk](../exercises/brisk_walk.md) – 10 min
- [Calf Stretch](../exercises/calf_stretch.md) – 60 sec

Cues: Smooth effort, tall posture, quick cadence, relaxed shoulders. Back off if any joint pain.

All exercises are linked to detail pages.

```json session-structure
{
	"version": "1",
	"title": "Quality Run – 4 Miles (Tempo)",
	"date": "2025-08-23",
	"block": 2,
	"week": 2,
		"sections": [
			{
				"type": "Warm-up",
				"title": "Warm-Up",
				"items": [
					{ "kind": "exercise", "name": "Easy Jog", "link": "../exercises/easy_jog.md", "prescription": { "timeSeconds": 600 } },
					{ "kind": "exercise", "name": "Leg Swings", "link": "../exercises/leg_swings.md", "prescription": { "reps": 10 } }
				]
			},
		{
			"type": "Conditioning",
			"title": "Main",
					"items": [
						{ "kind": "exercise", "name": "Tempo Mile", "prescription": { "sets": 2, "distanceMiles": 1, "rpe": 7.5, "restSeconds": 210 } },
						{ "kind": "note", "name": "Remaining Distance", "prescription": {}, "cues": ["Run easy to total ~4 miles including rest jogs."] }
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
				{ "kind": "exercise", "name": "Brisk Walk", "link": "../exercises/brisk_walk.md", "prescription": { "timeSeconds": 600 } },
				{ "kind": "exercise", "name": "Calf Stretch", "link": "../exercises/calf_stretch.md", "prescription": { "holdSeconds": 60 } }
			]
		}
	]
}
```
