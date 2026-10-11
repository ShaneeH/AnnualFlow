# Report Hub

**AI Financial Document Intelligence Platform**

An intelligent platform that turns complex financial reports into clear, structured data automatically.

This project is being developed as part of a graduate software engineering technical assessment. It shows how modern AI can work together with solid backend systems and databases to solve a real business problem.

---

## The Problem

Financial reports are long. They often run to hundreds of pages filled with statements, notes, and commentary. Manually pulling out the key numbers is slow, repetitive, and easy to get wrong.

This platform removes that manual work.

---

## What It Does

Simply upload a financial PDF and the system takes care of the rest:

- Reads and understands the document using AI  
- Pulls out the important financial figures  
- Checks that the information is complete and accurate  
- Creates a unique ID for the report  
- Detects if the same report has already been uploaded  
- Saves everything cleanly in a database  
- Makes the data ready for easy viewing and analysis  

The long-term vision is a smart financial reporting platform that can handle reports from thousands of companies.

---

## Key Features

### Smart PDF Understanding
Works with many types of financial documents, including:

- Annual Reports  
- Interim Reports  
- Information Documents  
- Investor Reports  
- Financial Statements  

Instead of relying on rigid rules or basic text extraction, the system uses AI to actually understand the content of each report.

### Accurate Financial Data Extraction
Automatically finds and extracts key figures such as:

- Revenue  
- Gross Profit  
- Operating Profit  
- EBITDA  
- Net Profit  
- Cash  
- Debt  
- Net Assets  
- Customer Numbers  

The AI is carefully instructed to extract only what is written in the document — no calculations or estimates are added. The numbers stay true to the original report.

### Multiple Time Periods in One Go
Many reports contain figures for more than one period. The platform automatically finds all of them, for example:

- FY2025  
- FY2024  
- Q1 2025  
- Q4 2024  

This makes year-on-year or quarter-on-quarter comparisons much easier without needing to upload the same document multiple times.

### Clear AI-Written Summaries
For every document, the AI also creates short, readable summaries covering:

- How the company performed  
- Key financial highlights  
- The business outlook  

These summaries are stored alongside the numbers so they’re easy to review later.

### Unique Report Identification
Every report is given a consistent ID based on its content. This means:

- The same report always gets the same ID  
- Duplicate uploads are easily detected  
- Reports stay organised and easy to manage  

### Built-in Quality Checks
Before anything is saved, the system checks that essential details are present and valid:

- Company name  
- Report title  
- Report type  
- Financial periods  

Incomplete or unclear results are stopped before they reach the database.

### No More Duplicate Reports
If the same report is uploaded again, the system recognises it and avoids re-processing. At the same time, new reports from the same company can still add extra information, helping build a richer picture over time.

### Clean Database Storage
All information is stored in a well-structured PostgreSQL database designed around:

- Companies  
- Documents  
- Reporting periods  
- Financial metrics  

This makes the data easy to query and ready to grow as more reports are added.


## Technology Overview

**Frontend**  
- Angular (in progress)

**Backend**  
- Node.js + Express + TypeScript

**Database**  
- PostgreSQL

**AI**  
- OpenAI Responses API and Files API

**Tools used during development**  
- Bruno, Postman, Git, VS Code

---


