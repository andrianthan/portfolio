---
company: Micron Technology
title: Data Science Intern
project: LLM copilot and wafer risk model
dates: May 2025 – Aug 2025
start: "2025-05"
end: "2025-08"
summary: "Built an LLM copilot that engineers used daily to investigate wafer failure rates, and a gradient boosting risk model that ranks high-risk wafers, on Python and Snowflake pipelines over high-volume manufacturing data."
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

- **Data pipelines.** Python and Snowflake SQL pipelines process the manufacturing data.
- **A Copilot and Power Automate workflow.** It connects Snowflake queries to GPT-based reasoning: an engineer asks a question in plain language, the workflow pulls the relevant data from Snowflake, and the model reasons over what comes back.
  - Querying Snowflake first and reasoning second means the model works over the relevant data, not every production step.

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
