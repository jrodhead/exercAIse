# Full-Body Conditioning & Core – Block 2, Week 2 (Friday)
**Date:** August 22, 2025

---

### Format: Circuit, 3–4 rounds; Rest 60–75 sec between rounds

1) [Dumbbell Thruster (Squat + Press)](../exercises/dumbbell_thruster.md) – 10–12 reps  
Cues: Squat deep, drive to press, core braced

2) [Renegade Row](../exercises/renegade_row.md) – 6–8/side  
Cues: Hips square, row to ribs, slow lower

3) [Step-Up](../exercises/step_up.md) – 10/leg  
Cues: Drive through heel, control descent, tall posture

4) [Plank Shoulder Tap](../exercises/plank_shoulder_tap.md) – 20 taps (10/side)  
Cues: Minimize hip sway, wide feet if needed

---

### Core Finisher
- [Weighted Deadbug](../exercises/weighted_deadbug.md): 2 x 12 (6/side)  
- [Hollow Hold](../exercises/hollow_hold.md): 2 x 20–30 sec

---

### Cooldown (5–8 min)
- [Child’s Pose](../exercises/childs_pose.md): 1–2 min  
- [Thread the Needle](../exercises/thread_the_needle.md): 1 min/side  
- [Seated Forward Fold](../exercises/seated_forward_fold.md): 1 min

---

All exercises are linked to detail pages. Any new exercises have corresponding files in `exercises/`.

```json session-structure
{
	"version": "1",
	"title": "Full-Body Conditioning & Core",
	"date": "2025-08-22",
	"block": 2,
	"week": 2,
	"sections": [
			{
				"type": "Main Work",
				"title": "Circuit (3–4 rounds)",
				"rounds": 4,
			"items": [
				{ "kind": "exercise", "name": "Dumbbell Thruster (Squat + Press)", "link": "../exercises/dumbbell_thruster.md", "prescription": { "sets": 1, "reps": "10–12" }, "cues": ["Squat deep", "Drive to press", "Core braced"] },
				{ "kind": "exercise", "name": "Renegade Row", "link": "../exercises/renegade_row.md", "prescription": { "sets": 1, "reps": "6–8/side" }, "cues": ["Hips square", "Row to ribs", "Slow lower"] },
				{ "kind": "exercise", "name": "Step-Up", "link": "../exercises/step_up.md", "prescription": { "sets": 1, "reps": "10/leg" }, "cues": ["Drive through heel", "Control descent", "Tall posture"] },
				{ "kind": "exercise", "name": "Plank Shoulder Tap", "link": "../exercises/plank_shoulder_tap.md", "prescription": { "sets": 1, "reps": "20 taps (10/side)" }, "cues": ["Minimize hip sway", "Wide feet if needed"] }
			]
		},
		{
			"type": "Accessory/Core",
			"title": "Core Finisher",
			"items": [
				{ "kind": "exercise", "name": "Weighted Deadbug", "link": "../exercises/weighted_deadbug.md", "prescription": { "sets": 2, "reps": "12 (6/side)" } },
				{ "kind": "exercise", "name": "Hollow Hold", "link": "../exercises/hollow_hold.md", "prescription": { "sets": 2, "timeSeconds": 20 } }
			]
		},
		{
			"type": "Cooldown/Recovery",
			"title": "Cooldown",
			"items": [
				{ "kind": "exercise", "name": "Child’s Pose", "link": "../exercises/childs_pose.md", "prescription": { "holdSeconds": 60 } },
				{ "kind": "exercise", "name": "Thread the Needle", "link": "../exercises/thread_the_needle.md", "prescription": { "holdSeconds": 60 } },
				{ "kind": "exercise", "name": "Seated Forward Fold", "link": "../exercises/seated_forward_fold.md", "prescription": { "holdSeconds": 60 } }
			]
		}
	]
}
```
