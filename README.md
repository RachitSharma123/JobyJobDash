# JobyJobDash

This repository now includes a **Streamlit-friendly app** so the job dashboard can run without Next.js.

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

- CSV upload
- Search by title/company/location/description
- Filters for status/company/location
- Salary-range filter
- KPI cards (total, applied, interviewing, offers, visible)
- Editable table with **Save status updates**
