from __future__ import annotations

from datetime import date, datetime, timezone
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
    date_from: date | None,
    date_to: date | None,
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

    if "date_found" in filtered.columns and (date_from or date_to):
        parsed_dates = pd.to_datetime(filtered["date_found"], errors="coerce", utc=True).dt.date
        if date_from:
            filtered = filtered[parsed_dates >= date_from]
            parsed_dates = parsed_dates.loc[filtered.index]
        if date_to:
            filtered = filtered[parsed_dates <= date_to]

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


def inject_styles() -> None:
    st.markdown(
        """
        <style>
        .stApp {
            background: radial-gradient(circle at 10% 10%, #f3e8ff 0%, #f8fafc 35%, #ecfeff 100%);
        }
        .hero {
            padding: 16px 20px;
            border-radius: 18px;
            background: linear-gradient(90deg,#7c3aed 0%, #db2777 55%, #06b6d4 100%);
            color: white;
            margin-bottom: 12px;
            box-shadow: 0 10px 26px rgba(124,58,237,.25);
        }
        .hero h1 { margin: 0; font-size: 2rem; }
        .hero p { margin: 0; opacity: .95; }

        .card {
            border-radius: 14px;
            padding: 14px;
            color: white;
            text-align: center;
            box-shadow: 0 10px 20px rgba(15,23,42,.14);
        }

        div[data-testid="stButton"] > button {
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            font-weight: 600;
        }
        .chip {
            display:inline-block;
            padding: 4px 10px;
            border-radius:999px;
            font-size:.78rem;
            font-weight:600;
            margin-right:6px;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def stat_cards(df: pd.DataFrame) -> None:
    status_series = df.get("status", pd.Series(dtype=str)).fillna("").astype(str).str.lower()
    docs_count = int(has_docs_attached(df).sum()) if not df.empty else 0

    cards = [
        ("Total Jobs", len(df), "linear-gradient(135deg,#8b5cf6,#c026d3)"),
        ("Ready to Apply", int((status_series == STATUS_NEW).sum()), "linear-gradient(135deg,#06b6d4,#3b82f6)"),
        ("Applied", int((status_series == STATUS_APPLIED).sum()), "linear-gradient(135deg,#10b981,#22c55e)"),
        ("Rejected", int((status_series == STATUS_REJECTED).sum()), "linear-gradient(135deg,#f43f5e,#fb7185)"),
        ("With Docs", docs_count, "linear-gradient(135deg,#f59e0b,#f97316)"),
    ]

    cols = st.columns(5)
    for col, (label, value, gradient) in zip(cols, cards):
        col.markdown(
            f"""
            <div class="card" style="background:{gradient};">
              <div style="font-size:0.82rem;opacity:0.96;">{label}</div>
              <div style="font-size:1.8rem;font-weight:800;line-height:1.05;">{value}</div>
            </div>
            """,
            unsafe_allow_html=True,
        )


def status_style(status: str) -> tuple[str, str, str, str]:
    s = (status or "").lower()
    if s == STATUS_NEW:
        return ("#06b6d4", "#ecfeff", "", '<span class="chip" style="background:#cffafe;color:#0e7490;">🌀 NEW</span>')
    if s == STATUS_APPLIED:
        return ("#10b981", "#ecfdf5", "", '<span class="chip" style="background:#d1fae5;color:#065f46;">✅ APPLIED</span>')
    if s == STATUS_REJECTED:
        return (
            "#f43f5e",
            "#fff1f2",
            "text-decoration: line-through; opacity: 0.6;",
            '<span class="chip" style="background:#ffe4e6;color:#9f1239;">👎 REJECTED</span>',
        )
    return ("#cbd5e1", "#f8fafc", "", '<span class="chip" style="background:#e2e8f0;color:#334155;">❔ UNKNOWN</span>')


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
        salary_min = row.get("salary_min")
        salary_max = row.get("salary_max")
        apply_url = row.get("apply_url") or row.get("job_url")

        has_docs = bool(has_docs_attached(pd.DataFrame([row])).iloc[0])
        docs_badges = []
        if str(row.get("resume_storage_path", "")).strip() or str(row.get("resume_url", "")).strip():
            docs_badges.append('<span class="chip" style="background:#10b981;color:white;">📄 Resume Ready</span>')
        if str(row.get("cover_letter_storage_path", "")).strip() or str(row.get("cover_url", "")).strip():
            docs_badges.append('<span class="chip" style="background:#f59e0b;color:white;">🧾 Cover Ready</span>')
        if not docs_badges and has_docs:
            docs_badges.append('<span class="chip" style="background:#06b6d4;color:white;">📎 Docs Attached</span>')

        border, bg, text_style, status_chip = status_style(status)
        salary_text = ""
        if pd.notna(salary_min) and pd.notna(salary_max):
            salary_text = f"💰 ${int(float(salary_min)):,} - ${int(float(salary_max)):,}"

        st.markdown(
            f"""
            <div style="border-left: 7px solid {border}; background:{bg}; padding:14px; border-radius:12px; margin:12px 0; box-shadow:0 8px 20px rgba(15,23,42,.08);">
              <div style="font-size:1.14rem; font-weight:800; color:#0f172a; {text_style}">{escape(title)}</div>
              <div style="font-size:0.95rem; color:#475569; margin-top:4px;">🏢 {escape(company)} &nbsp; 📍 {escape(location)} &nbsp; {salary_text}</div>
              <div style="margin-top:8px;">{status_chip}{''.join(docs_badges)}</div>
            </div>
            """,
            unsafe_allow_html=True,
        )

        c1, c2 = st.columns([1.2, 1])
        with c1:
            if st.button("👍 Mark Applied", key=f"apply_{job_id}", use_container_width=True, type="primary"):
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
    st.set_page_config(page_title="JobyJobDash (Streamlit)", page_icon="🚀", layout="wide")
    inject_styles()

    st.markdown(
        """
        <div class="hero">
            <h1>🚀 Job Hunt Dashboard</h1>
            <p>✨ Let’s land your dream job — now with colorful status signals.</p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    uploaded = st.file_uploader("📤 Upload CSV", type=["csv"])
    if uploaded is not None:
        uploaded_df = pd.read_csv(uploaded)
        save_jobs(uploaded_df, DATA_PATH)
        st.cache_data.clear()
        st.success(f"Uploaded {len(uploaded_df)} rows to {DATA_PATH}.")

    jobs_df = load_jobs(DATA_PATH)
    if jobs_df.empty:
        st.warning("No jobs found. Upload a CSV to get started.")
        st.stop()

    if "has_docs_only" not in st.session_state:
        st.session_state.has_docs_only = False

    with st.sidebar:
        st.header("🎛️ Filters")
        query = st.text_input("🔎 Search", value="")

        statuses = ["all"] + sorted(jobs_df["status"].dropna().astype(str).str.lower().unique().tolist()) if "status" in jobs_df.columns else ["all"]
        companies = ["all"] + sorted(jobs_df["company"].dropna().astype(str).unique().tolist()) if "company" in jobs_df.columns else ["all"]
        locations = ["all"] + sorted(jobs_df["location"].dropna().astype(str).unique().tolist()) if "location" in jobs_df.columns else ["all"]

        status = st.selectbox("Status", statuses, index=0)
        company = st.selectbox("Company", companies, index=0)
        location = st.selectbox("Location", locations, index=0)

        if st.button("📄 Has Documents", use_container_width=True, type="primary" if st.session_state.has_docs_only else "secondary"):
            st.session_state.has_docs_only = not st.session_state.has_docs_only

        if st.session_state.has_docs_only:
            st.success("Has Documents: ON")
        else:
            st.info("Has Documents: OFF")

        date_from = None
        date_to = None
        if "date_found" in jobs_df.columns:
            st.markdown("#### 📅 Date Found")
            parsed_all = pd.to_datetime(jobs_df["date_found"], errors="coerce", utc=True).dt.date.dropna()
            if not parsed_all.empty:
                min_date = parsed_all.min()
                max_date = parsed_all.max()
                picked = st.date_input(
                    "Select range",
                    value=(min_date, max_date),
                    min_value=min_date,
                    max_value=max_date,
                    help="Filter jobs based on when they were found.",
                )
                if isinstance(picked, tuple) and len(picked) == 2:
                    date_from, date_to = picked
                    st.caption(f"Showing jobs from {date_from.isoformat()} to {date_to.isoformat()}")
                elif isinstance(picked, date):
                    date_from = picked
                    date_to = picked

        salary_min, salary_max = salary_range(jobs_df)
        selected_min, selected_max = st.slider(
            "💵 Salary range",
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
        date_from=date_from,
        date_to=date_to,
    )

    stat_cards(jobs_df)
    st.markdown("### 🎯 Job Feed")
    render_job_cards(filtered_df, jobs_df)


if __name__ == "__main__":
    main()
