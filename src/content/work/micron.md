---
company: Micron Technology
title: Data Science Intern
project: LLM copilot and wafer risk model
dates: May 2025 – Aug 2025
start: "2025-05"
end: "2025-08"
summary: "Built the data layer, Copilot and Power Automate workflow and GPT-based reasoning behind an HBM wafer analysis copilot, plus a gradient boosting risk model that ranks high-risk wafers, on Python and Snowflake pipelines over high-volume manufacturing data."
stack: [Python, Snowflake SQL, Power Automate, Microsoft Copilot, GPT, Gradient boosting]
logo: /logos/micron.svg
listed: true
cleared: true
order: 4
---
## Wafer analysis copilot

An LLM copilot over high-volume manufacturing data for HBM wafers. Engineers used it every day to investigate wafer failure rates, asking questions like what made a specific wafer fail.

### Problem

The manufacturing data for one wafer spans thousands of production steps. Working through it by hand to explain a failure took a lot of manual analysis time.

### Architecture

- **Data pipelines.** Python and Snowflake SQL pipelines clean the manufacturing data, join it by wafer, tool and production step, and roll it up into failure rates and Z-scores per wafer and per tool.
  - Rolling up in the pipeline instead of at question time means the copilot reads small summary tables, not thousands of raw steps per wafer.
- **Question to query.** A Power Automate flow takes the engineer's plain-language question, pulls out the wafer ID, tool or date range, and runs a parameterized Snowflake query for it.
  - Fixed, parameterized queries instead of model-written SQL mean the copilot can only read the data it was built to read.
- **A Copilot and Power Automate workflow.** It connects Snowflake queries to GPT-based reasoning: the workflow pulls the relevant data from Snowflake, and the model reasons over what comes back.
  - Querying Snowflake first and reasoning second means the model works over the relevant data, not every production step.
- **Reasoning over a summary.** GPT receives the query results with the baselines next to them, such as the tool's normal failure rate, and explains which steps or tools stand out for that wafer.
  - Handing the model the baseline instead of raw rows lets it point at what is unusual instead of guessing.
- **Where engineers used it.** Engineers asked in chat and got the answer back in the same place, with the underlying numbers shown beside the explanation.
  - Showing the numbers next to the answer lets an engineer check a conclusion before acting on it.

### Impact

Used daily by 10+ engineers to investigate wafer failure rates, including what made a specific wafer fail. Explaining one failure went from hours by hand to minutes.

## Wafer risk model

A risk classification model that ranks wafers, so engineers know which ones to look at first.

### Problem

Engineers cannot review every wafer. They needed the high-risk ones to surface first.

### Architecture

- **A gradient boosting model.** It is trained on wafers that had failed before. Its inputs include Z-score, failure rate and wafer size, plus other factors such as which machines each wafer went through.
  - Back-testing on earlier failures checks the ranking against what really failed.
- **A ranked list.** It scores each wafer, and the highest scores rise to the top of the list.

### Impact

The model scored 1,000+ wafers. Engineers used the ranking to decide which wafers to analyze first and to inform yield optimization work.
