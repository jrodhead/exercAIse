# Upper Body Strength & Mobility – Block 2, Week 2
**Date:** August 18, 2025

---

## Warm-Up (5–7 min)
- [Arm Circles](../exercises/arm_circles.json): 30 sec each direction
- [Band Pull-Aparts](../exercises/band_pull_aparts.json): 2 x 12
- [Cat-Cow to Cobra Stretch](../exercises/cat_cow_to_cobra_stretch.json): 5 reps each

---

## Main Sets

### 1) [Neutral-Grip Flat Bench Press (Dumbbells)](../exercises/neutral_grip_flat_bench_press.json)
- 4 x 6–8, Rest 90 sec
- Cues: Elbows ~45°, pause at chest, core braced

### 2) [One-Arm Dumbbell Row (Bench Supported)](../exercises/one_arm_dumbbell_row.json)
- 4 x 8–10/side, Rest 75 sec
- Cues: Row to hip, keep hips square, slow lower

### 3) [Seated Arnold Press](../exercises/seated_arnold_press.json)
- 3 x 8–10, Rest 75 sec
- Cues: Rotate palms through press, back on bench

### 4) [Biceps Curl (Alternating Dumbbells)](../exercises/biceps_curl.json)
- 3 x 10–12, Rest 60 sec
- Cues: Elbows close, avoid swinging

### 5) [Overhead Dumbbell Triceps Extension (Two Hands)](../exercises/overhead_dumbbell_triceps_extension.json)
- 3 x 10–12, Rest 60 sec
- Cues: Elbows close, full stretch, control

---

## Cooldown (5–8 min)
- [Child’s Pose](../exercises/childs_pose.json): 1–2 min
- [Thread the Needle](../exercises/thread_the_needle.json): 1 min/side
- [Seated Forward Fold](../exercises/seated_forward_fold.json): 1 min

---

All exercises are linked to detail pages. Any new exercises have corresponding files in `exercises/`.

```json session-structure
{
	"version": "1",
	"title": "Upper Body Strength & Mobility",
	"date": "2025-08-18",
	"block": 2,
	"week": 2,
	"sections": [
		{
			"type": "Warm-up",
			"title": "Warm-Up",
			"items": [
				{ "kind": "exercise", "name": "Arm Circles", "link": "../exercises/arm_circles.md", "prescription": { "timeSeconds": 30 } },
				{ "kind": "exercise", "name": "Band Pull-Aparts", "link": "../exercises/band_pull_aparts.md", "prescription": { "sets": 2, "reps": 12 } },
				{ "kind": "exercise", "name": "Cat-Cow to Cobra Stretch", "link": "../exercises/cat_cow_to_cobra_stretch.md", "prescription": { "reps": 5 } }
			]
		},
		{
			"type": "Main Work",
			"title": "Main Sets",
			"items": [
				{
					"kind": "exercise",
					"name": "Neutral-Grip Flat Bench Press (Dumbbells)",
					"link": "../exercises/neutral_grip_flat_bench_press.md",
					"cues": ["Elbows ~45°", "Pause at chest", "Core braced"],
					"prescription": { "sets": 4, "reps": "6–8", "restSeconds": 90 }
				},
				{
					"kind": "exercise",
					"name": "One-Arm Dumbbell Row (Bench Supported)",
					"link": "../exercises/one_arm_dumbbell_row.md",
					"cues": ["Row to hip", "Hips square", "Slow lower"],
					"prescription": { "sets": 4, "reps": "8–10/side", "restSeconds": 75 }
				},
				{
					"kind": "exercise",
					"name": "Seated Arnold Press",
					"link": "../exercises/seated_arnold_press.md",
					"cues": ["Rotate palms through press", "Back on bench"],
					"prescription": { "sets": 3, "reps": "8–10", "restSeconds": 75 }
				},
				{
					"kind": "exercise",
					"name": "Biceps Curl (Alternating Dumbbells)",
					"link": "../exercises/biceps_curl.md",
					"cues": ["Elbows close", "Avoid swinging"],
					"prescription": { "sets": 3, "reps": "10–12", "restSeconds": 60 }
				},
				{
					"kind": "exercise",
					"name": "Overhead Dumbbell Triceps Extension (Two Hands)",
					"link": "../exercises/overhead_dumbbell_triceps_extension.md",
					"cues": ["Elbows close", "Full stretch", "Control"],
					"prescription": { "sets": 3, "reps": "10–12", "restSeconds": 60 }
				}
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
