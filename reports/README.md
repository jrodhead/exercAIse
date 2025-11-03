# Training Progress Reports

This directory contains AI-generated training progress reports created by Kai (your AI strength coach).

## How Reports are Generated

Reports are created by Kai analyzing your performance logs in `performed/` and applying the prompt template in `.github/prompts/generate-training-progress-report.prompt.md`.

### To Generate a New Report:

1. Open GitHub Copilot Chat (or your AI assistant)
2. Use this prompt:

```
Generate a training progress report for [time period].

Follow .github/prompts/generate-training-progress-report.prompt.md

Read all performance logs in performed/ within the specified date range and analyze:
- Strength progression by movement pattern
- Endurance improvements  
- Volume trends
- RPE patterns and recovery
- Key achievements and areas for improvement

Save the report as: reports/YYYY-MM-DD_blocks-X-Y.html
Update reports/index.json with the new report metadata
```

3. Kai will:
   - Read all `performed/*.json` files in the date range
   - Analyze progression across all exercises
   - Generate comprehensive HTML report
   - Save to this directory
   - Update `index.json` manifest

## Report Structure

Each report includes:

- **Executive Summary**: Key achievements, adherence, injury status
- **Strength Progression Tables**: By movement pattern (squat, press, pull, etc.)
- **Endurance Metrics**: Running progression, pace improvements
- **Volume Analysis**: Total volume trends and progressive overload
- **Key Performance Indicators**: Top strength gains, notable achievements
- **Observations**: What's working well, areas for attention
- **Overall Grade**: Holistic assessment of progress

## Viewing Reports

Reports are displayed at `progress-report.html` in the exercAIse app. The page automatically loads the most recent report.

## File Naming Convention

`YYYY-MM-DD_blocks-X-Y.html` where:
- `YYYY-MM-DD`: Date report was generated
- `X`: First block in analysis period
- `Y`: Last block in analysis period

Example: `2025-11-02_blocks-2-4.html` (report generated Nov 2, 2025 covering Blocks 2-4)

## Manifest (index.json)

The `index.json` file tracks all generated reports:

```json
{
  "version": "1.0",
  "reports": [
    {
      "path": "reports/2025-11-02_blocks-2-4.html",
      "generated": "2025-11-02T12:00:00Z",
      "period": {
        "start": "2025-08-22",
        "end": "2025-10-31"
      },
      "blocks": "2-4",
      "sessions": 43,
      "highlights": [
        "22% goblet squat load increase",
        "75% running capacity increase",
        "Zero injuries across all blocks"
      ]
    }
  ]
}
```

## Architecture Note

Progress reports follow the **"AI Decides, App Executes"** principle:

✅ **AI (Kai) decides:** What data to analyze, how to interpret trends, what conclusions to draw, what recommendations to make

✅ **App executes:** Displays AI-generated reports, provides UI for selecting time ranges, stores reports for offline viewing

❌ **App never:** Calculates progressions, identifies plateaus, makes training recommendations, analyzes performance data

See `ARCHITECTURE.md` for more details.
