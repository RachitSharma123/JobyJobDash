from __future__ import annotations

from pathlib import Path

import pandas as pd
import streamlit as st

DATA_PATH = Path("upload/job_applications_rows.csv")


@st.cache_data(show_spinner=False)
def load_jobs(csv_path: Path) -> pd.DataFrame:
    if not csv_path.exists():
        return pd.DataFrame()
    return pd.read_csv(csv_path)


def save_jobs(df: pd.DataFrame, csv_path: Path) -> None:
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(csv_path, index=False)


def salary_range(df: pd.DataFrame) -> tuple[int, int]:
    if "salary_max" not in df.columns and "salary_min" not in df.columns:
        return (0, 300000)

    max_salary = 300000
    for col in ("salary_max", "salary_min"):
        if col in df.columns:
            series = pd.to_numeric(df[col], errors="coerce").dropna()
            if not series.empty:
                max_salary = max(max_salary, int(series.max()))
    return (0, max_salary)


def apply_filters(
    df: pd.DataFrame,
    query: str,
    status: str,
    company: str,
    location: str,
    min_salary: int,
    max_salary: int,
) -> pd.DataFrame:
    filtered = df.copy()

    if query:
        q = query.lower()
        searchable_columns = [c for c in ["title", "company", "description", "location"] if c in filtered.columns]
        if searchable_columns:
            mask = filtered[searchable_columns].fillna("").astype(str).apply(
                lambda row: any(q in v.lower() for v in row), axis=1
            )
            filtered = filtered[mask]

    if status != "all" and "status" in filtered.columns:
        filtered = filtered[filtered["status"].fillna("") == status]

    if company != "all" and "company" in filtered.columns:
        filtered = filtered[filtered["company"].fillna("") == company]

    if location != "all" and "location" in filtered.columns:
        filtered = filtered[filtered["location"].fillna("") == location]

    if "salary_max" in filtered.columns:
        salary_max_series = pd.to_numeric(filtered["salary_max"], errors="coerce").fillna(0)
        filtered = filtered[(salary_max_series == 0) | (salary_max_series >= min_salary)]

    if "salary_min" in filtered.columns:
        salary_min_series = pd.to_numeric(filtered["salary_min"], errors="coerce").fillna(0)
        filtered = filtered[(salary_min_series == 0) | (salary_min_series <= max_salary)]

    return filtered


def main() -> None:
    st.set_page_config(page_title="JobyJobDash (Streamlit)", page_icon="💼", layout="wide")
    st.title("💼 JobyJobDash — Streamlit")
    st.caption("Upload, filter, and track your job applications from CSV.")

    uploaded = st.file_uploader("Upload CSV", type=["csv"])

    if uploaded is not None:
        uploaded_df = pd.read_csv(uploaded)
        save_jobs(uploaded_df, DATA_PATH)
        st.cache_data.clear()
        st.success(f"Saved {len(uploaded_df)} jobs to {DATA_PATH}.")

    jobs_df = load_jobs(DATA_PATH)

    if jobs_df.empty:
        st.warning("No jobs found. Upload a CSV to get started.")
        st.stop()

    # Sidebar filters
    with st.sidebar:
        st.header("Filters")
        query = st.text_input("Search", value="")

        statuses = ["all"] + sorted(jobs_df["status"].dropna().astype(str).unique().tolist()) if "status" in jobs_df.columns else ["all"]
        companies = ["all"] + sorted(jobs_df["company"].dropna().astype(str).unique().tolist()) if "company" in jobs_df.columns else ["all"]
        locations = ["all"] + sorted(jobs_df["location"].dropna().astype(str).unique().tolist()) if "location" in jobs_df.columns else ["all"]

        status = st.selectbox("Status", statuses, index=0)
        company = st.selectbox("Company", companies, index=0)
        location = st.selectbox("Location", locations, index=0)

        salary_min, salary_max = salary_range(jobs_df)
        selected_min, selected_max = st.slider(
            "Salary range",
            min_value=salary_min,
            max_value=salary_max,
            value=(salary_min, salary_max),
            step=5000,
        )

    filtered_df = apply_filters(
        jobs_df,
        query=query,
        status=status,
        company=company,
        location=location,
        min_salary=selected_min,
        max_salary=selected_max,
    )

    # Metrics
    c1, c2, c3, c4, c5 = st.columns(5)
    total = len(jobs_df)
    applied = int((jobs_df.get("status", pd.Series(dtype=str)) == "applied").sum())
    interviewing = int((jobs_df.get("status", pd.Series(dtype=str)) == "interviewing").sum())
    offers = int((jobs_df.get("status", pd.Series(dtype=str)) == "offer").sum())
    filtered = len(filtered_df)

    c1.metric("Total jobs", total)
    c2.metric("Applied", applied)
    c3.metric("Interviewing", interviewing)
    c4.metric("Offers", offers)
    c5.metric("Visible", filtered)

    st.subheader("Jobs")

    # Let users update status directly.
    editable = filtered_df.copy()
    if "status" in editable.columns:
        st.caption("Tip: Update status values in the table and click **Save status updates**.")

    edited = st.data_editor(editable, use_container_width=True, num_rows="fixed", hide_index=True)

    if "id" in jobs_df.columns and "id" in edited.columns and "status" in edited.columns and st.button("Save status updates"):
        updated = jobs_df.copy()
        status_by_id = edited.set_index("id")["status"].to_dict()
        updated["status"] = updated.apply(
            lambda row: status_by_id.get(row["id"], row.get("status", "")),
            axis=1,
        )
        save_jobs(updated, DATA_PATH)
        st.cache_data.clear()
        st.success("Statuses saved.")
        st.rerun()


if __name__ == "__main__":
    main()
