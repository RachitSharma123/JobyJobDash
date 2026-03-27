from __future__ import annotations

from datetime import datetime, timezone
from html import escape
from pathlib import Path

import pandas as pd
import streamlit as st
import streamlit.components.v1 as components

DATA_PATH = Path("upload/job_applications_rows.csv")
STATUS_NEW = "new"
STATUS_APPLIED = "applied"
STATUS_REJECTED = "rejected"


@st.cache_data(show_spinner=False)
def load_jobs(csv_path: Path) -> pd.DataFrame:
    if not csv_path.exists():
        return pd.DataFrame()
    return pd.read_csv(csv_path)


def save_jobs(df: pd.DataFrame, csv_path: Path) -> None:
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(csv_path, index=False)


def has_docs_attached(df: pd.DataFrame) -> pd.Series:
    doc_columns = [
        c
        for c in ["resume_storage_path", "cover_letter_storage_path", "resume_url", "cover_url"]
        if c in df.columns
    ]
    if not doc_columns:
        return pd.Series([False] * len(df), index=df.index)

    normalized = df[doc_columns].fillna("").astype(str).apply(lambda c: c.str.strip())
    return normalized.ne("").any(axis=1)


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
    docs_only: bool,
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
        filtered = filtered[filtered["status"].fillna("").str.lower() == status]

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

    if docs_only:
        filtered = filtered[has_docs_attached(filtered)]

    return filtered


def update_job_status(df: pd.DataFrame, job_id: str, new_status: str) -> pd.DataFrame:
    updated = df.copy()
    if "id" not in updated.columns or "status" not in updated.columns:
        return updated

    target = updated["id"].astype(str) == str(job_id)
    updated.loc[target, "status"] = new_status

    if new_status == STATUS_APPLIED and "applied_at" in updated.columns:
        updated.loc[target, "applied_at"] = datetime.now(timezone.utc).isoformat()

    return updated


def open_url_new_tab(url: str) -> None:
    safe_url = escape(url, quote=True)
    components.html(
        f"""
        <script>
        window.open('{safe_url}', '_blank');
        </script>
        """,
        height=0,
        width=0,
    )


def stat_cards(df: pd.DataFrame) -> None:
    status_series = df.get("status", pd.Series(dtype=str)).fillna("").astype(str).str.lower()
    docs_count = int(has_docs_attached(df).sum()) if not df.empty else 0

    cards = [
        ("Total Jobs", len(df), "#8B5CF6"),
        ("Ready to Apply", int((status_series == STATUS_NEW).sum()), "#06B6D4"),
        ("Applied", int((status_series == STATUS_APPLIED).sum()), "#10B981"),
        ("Rejected", int((status_series == STATUS_REJECTED).sum()), "#F43F5E"),
        ("With Docs", docs_count, "#F59E0B"),
    ]

    cols = st.columns(5)
    for col, (label, value, color) in zip(cols, cards):
        col.markdown(
            f"""
            <div style="background:{color};padding:14px;border-radius:14px;color:white;text-align:center;">
              <div style="font-size:0.85rem;opacity:0.95;">{label}</div>
              <div style="font-size:1.7rem;font-weight:700;line-height:1.1;">{value}</div>
            </div>
            """,
            unsafe_allow_html=True,
        )


def status_style(status: str) -> tuple[str, str, str]:
    s = (status or "").lower()
    if s == STATUS_NEW:
        return ("#06B6D4", "#ECFEFF", "")
    if s == STATUS_APPLIED:
        return ("#10B981", "#ECFDF5", "")
    if s == STATUS_REJECTED:
        return ("#F43F5E", "#FFF1F2", "text-decoration: line-through; opacity: 0.6;")
    return ("#CBD5E1", "#F8FAFC", "")


def render_job_cards(filtered_df: pd.DataFrame, full_df: pd.DataFrame) -> None:
    if filtered_df.empty:
        st.info("No jobs match your filters.")
        return

    for _, row in filtered_df.iterrows():
        job_id = str(row.get("id", ""))
        title = str(row.get("title", "Untitled role"))
        company = str(row.get("company", "Unknown company"))
        location = str(row.get("location", ""))
        status = str(row.get("status", "")).lower()
        apply_url = row.get("apply_url") or row.get("job_url")

        border, bg, text_style = status_style(status)

        st.markdown(
            f"""
            <div style="border-left: 7px solid {border}; background:{bg}; padding:14px; border-radius:10px; margin:10px 0;">
              <div style="font-size:1.05rem; font-weight:700; {text_style}">{escape(title)}</div>
              <div style="font-size:0.93rem; color:#475569;">{escape(company)} • {escape(location)} • status: <b>{escape(status or 'unknown')}</b></div>
            </div>
            """,
            unsafe_allow_html=True,
        )

        c1, c2 = st.columns([1, 1])
        with c1:
            if st.button("👍 Mark Applied", key=f"apply_{job_id}", use_container_width=True):
                updated = update_job_status(full_df, job_id, STATUS_APPLIED)
                save_jobs(updated, DATA_PATH)
                st.cache_data.clear()
                if isinstance(apply_url, str) and apply_url.strip():
                    open_url_new_tab(apply_url)
                st.balloons()
                st.toast("Applied! Great momentum 🎊")
                st.rerun()
        with c2:
            if st.button("👎 Reject", key=f"reject_{job_id}", use_container_width=True):
                updated = update_job_status(full_df, job_id, STATUS_REJECTED)
                save_jobs(updated, DATA_PATH)
                st.cache_data.clear()
                st.toast("Next one will be better! 💪")
                st.rerun()


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

    if "has_docs_only" not in st.session_state:
        st.session_state.has_docs_only = False

    with st.sidebar:
        st.header("Filters")
        query = st.text_input("Search", value="")

        statuses = ["all"] + sorted(jobs_df["status"].dropna().astype(str).str.lower().unique().tolist()) if "status" in jobs_df.columns else ["all"]
        companies = ["all"] + sorted(jobs_df["company"].dropna().astype(str).unique().tolist()) if "company" in jobs_df.columns else ["all"]
        locations = ["all"] + sorted(jobs_df["location"].dropna().astype(str).unique().tolist()) if "location" in jobs_df.columns else ["all"]

        status = st.selectbox("Status", statuses, index=0)
        company = st.selectbox("Company", companies, index=0)
        location = st.selectbox("Location", locations, index=0)

        if st.button("📄 Has Documents", use_container_width=True):
            st.session_state.has_docs_only = not st.session_state.has_docs_only
        if st.session_state.has_docs_only:
            st.markdown(":green[Has Documents filter is ON]")
        else:
            st.caption("Has Documents filter is OFF")

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
        docs_only=st.session_state.has_docs_only,
    )

    stat_cards(jobs_df)
    st.subheader("Job Feed")
    render_job_cards(filtered_df, jobs_df)


if __name__ == "__main__":
    main()
