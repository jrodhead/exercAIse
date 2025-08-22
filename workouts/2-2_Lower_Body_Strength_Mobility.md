# Lower Body Strength & Mobility – Block 2, Week 2
**Date:** August 20, 2025

---

## Warm-Up (5–7 min)
- [Bodyweight Squat](../exercises/bodyweight_squat.md): 2 x 12
- [Glute Bridge](../exercises/glute_bridge.md): 2 x 10
- [World’s Greatest Stretch](../exercises/worlds_greatest_stretch.md): 5/side

---

## Main Sets

### 1) [Goblet Squat](../exercises/goblet_squat.md)
- 4 x 6–8, Rest 90 sec
- Cues: Chest tall, knees track over toes, pause at bottom

### 2) [Dumbbell Romanian Deadlift](../exercises/dumbbell_romanian_deadlift.md)
- 4 x 8–10, Rest 90 sec
- Cues: Hinge at hips, back flat, feel hamstrings

### 3) [Bulgarian Split Squat](../exercises/bulgarian_split_squat.md)
- 3 x 8–10/leg, Rest 75 sec
- Cues: Front knee over mid-foot, slight forward torso, push through heel

### 4) [Standing Calf Raise](../exercises/standing_calf_raise.md)
- 3 x 12–15, Rest 45 sec
- Cues: Full range, pause at top, slow lower

---

## Core Accessory
- [Side Plank](../exercises/side_plank.md): 2 x 30–45 sec/side, Rest 45 sec

---

## Mobility & Cooldown (5–8 min)
- [90/90 Hip Stretch](../exercises/90_90_hip_stretch.md): 1 min/side
- [Lying Spinal Twist](../exercises/lying_spinal_twist.md): 1 min/side
- [Seated Forward Fold](../exercises/seated_forward_fold.md): 1 min

---

All exercises are linked to detail pages. Any new exercises have corresponding files in `exercises/`.

```json session-structure
{
	"version": "1",
	"title": "Lower Body Strength & Mobility",
	"date": "2025-08-20",
	"block": 2,
	"week": 2,
	"sections": [
		{
			"type": "Warm-up",
			"title": "Warm-Up",
			"items": [
				{ "kind": "exercise", "name": "Bodyweight Squat", "link": "../exercises/bodyweight_squat.md", "prescription": { "sets": 2, "reps": 12 } },
				{ "kind": "exercise", "name": "Glute Bridge", "link": "../exercises/glute_bridge.md", "prescription": { "sets": 2, "reps": 10 } },
				{ "kind": "exercise", "name": "World’s Greatest Stretch", "link": "../exercises/worlds_greatest_stretch.md", "prescription": { "reps": 5 } }
			]
		},
		{
			"type": "Main Work",
			"title": "Main Sets",
			"items": [
				{ "kind": "exercise", "name": "Goblet Squat", "link": "../exercises/goblet_squat.md", "prescription": { "sets": 4, "reps": "6–8", "restSeconds": 90 }, "cues": ["Chest tall", "Knees track over toes", "Pause at bottom"] },
				{ "kind": "exercise", "name": "Dumbbell Romanian Deadlift", "link": "../exercises/dumbbell_romanian_deadlift.md", "prescription": { "sets": 4, "reps": "8–10", "restSeconds": 90 }, "cues": ["Hinge at hips", "Back flat", "Feel hamstrings"] },
				{ "kind": "exercise", "name": "Bulgarian Split Squat", "link": "../exercises/bulgarian_split_squat.md", "prescription": { "sets": 3, "reps": "8–10/leg", "restSeconds": 75 }, "cues": ["Knee over mid-foot", "Slight forward torso", "Push through heel"] },
				{ "kind": "exercise", "name": "Standing Calf Raise", "link": "../exercises/standing_calf_raise.md", "prescription": { "sets": 3, "reps": "12–15", "restSeconds": 45 }, "cues": ["Full range", "Pause at top", "Slow lower"] }
			]
		},
		{
			"type": "Accessory/Core",
			"title": "Core Accessory",
			"items": [
				{ "kind": "exercise", "name": "Side Plank", "link": "../exercises/side_plank.md", "prescription": { "sets": 2, "timeSeconds": 30 } }
			]
		},
		{
			"type": "Cooldown/Recovery",
			"title": "Mobility & Cooldown",
			"items": [
				{ "kind": "exercise", "name": "90/90 Hip Stretch", "link": "../exercises/90_90_hip_stretch.md", "prescription": { "holdSeconds": 60 } },
				{ "kind": "exercise", "name": "Lying Spinal Twist", "link": "../exercises/lying_spinal_twist.md", "prescription": { "holdSeconds": 60 } },
				{ "kind": "exercise", "name": "Seated Forward Fold", "link": "../exercises/seated_forward_fold.md", "prescription": { "holdSeconds": 60 } }
			]
		}
	]
}
```
