# JobyJobDash

This repository includes a **Streamlit-friendly app** so the job dashboard can run without Next.js.

## Run with Streamlit

1. Install Python dependencies:

```bash
pip install -r requirements.txt
```

2. Start the dashboard:

```bash
streamlit run streamlit_app.py
```

3. Open the local URL shown by Streamlit (typically `http://localhost:8501`).

## Data source

The app reads and writes job data from:

- `upload/job_applications_rows.csv`

You can upload a new CSV from the UI and it will replace that file.

## Included features

- `📄 Has Documents` toggle button in Filters (shows only jobs with resume and/or cover letter attached).
- `👍 Mark Applied` per-job action (marks `applied`, opens job URL in new tab, and triggers a celebration).
- `👎 Reject` per-job action (marks `rejected` and shows motivational toast).
- Five colorful stats cards: Total Jobs, Ready to Apply, Applied, Rejected, With Docs.
- Visual border indicators on each job card:
  - Cyan border = NEW
  - Green border = Applied
  - Rose border + faded + strikethrough title = Rejected
- Search + status/company/location + salary filters.
- CSV upload and persistent status updates.
