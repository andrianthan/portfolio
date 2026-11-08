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

### What I built

Python and Snowflake SQL pipelines that process the manufacturing data, and a workflow built on Microsoft Copilot and Power Automate that connects Snowflake queries to GPT-based reasoning. An engineer asks a question in plain language, the workflow pulls the relevant data from Snowflake, and the model reasons over what comes back.

### How it was used

Engineers used it daily to investigate wafer failure rates, including what made a specific wafer fail.

## Wafer risk model

A risk classification model that ranks wafers, so engineers know which ones to look at first.

### Problem

Engineers cannot review every wafer. They needed the high-risk ones to surface first.

### What I built

A gradient boosting model trained on wafers that had failed before. Its inputs include Z-score, failure rate and wafer size, plus other factors such as which machines each wafer went through. It scores each wafer, and the highest scores rise to the top of the list.

### How I checked it

I back-tested it on earlier failures.

### How it was used

Engineers used the ranking to decide which wafers to analyze first and to inform yield optimization work.
