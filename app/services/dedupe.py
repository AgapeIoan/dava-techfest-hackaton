import sys
import itertools
from collections import Counter, defaultdict

import pandas as pd
import networkx as nx
from rapidfuzz import fuzz
from typing import List
from .ai_logic.orchestrator import get_ai_merge_suggestion as get_ai_suggestion

# -----------------------------
# Config (rule-based only)
# -----------------------------
THRESH_LINK   = 0.85   # >= => match
THRESH_REVIEW = 0.70   # [THRESH_REVIEW, THRESH_LINK) => review

WEIGHTS = {
    "name":    0.30,
    "dob":     0.25,
    "email":   0.20,
    "phone":   0.10,
    "address": 0.10,
    "gender":  0.05,
}

# -----------------------------
# Similarity utilities
# -----------------------------
def _to_str(x):
    return "" if pd.isna(x) else str(x).strip()

def name_sim(a, b):
    a, b = _to_str(a), _to_str(b)
    if not a or not b:
        return 0.0
    return fuzz.WRatio(a, b) / 100.0

def dob_sim(a, b):
    a, b = _to_str(a), _to_str(b)
    return 1.0 if a and b and a == b else 0.0

def email_sim(a, b):
    a, b = _to_str(a).lower(), _to_str(b).lower()
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    try:
        la, da = a.split("@", 1)
        lb, db = b.split("@", 1)
    except ValueError:
        return fuzz.WRatio(a, b) / 100.0
    if da == db:
        return max(0.6, fuzz.WRatio(la, lb) / 100.0)
    return fuzz.WRatio(a, b) / 100.0

def digits_only(x):
    return "".join(ch for ch in _to_str(x) if ch.isdigit())

def phone_sim(a, b, last_digits=4):
    a, b = digits_only(a), digits_only(b)
    if len(a) < last_digits or len(b) < last_digits:
        return 0.0
    return 1.0 if a[-last_digits:] == b[-last_digits:] else 0.0

def address_sim(a, b):
    a, b = _to_str(a).lower(), _to_str(b).lower()
    if not a or not b:
        return 0.0
    toks_a = set(t for t in a.replace(",", " ").split() if len(t) > 2)
    toks_b = set(t for t in b.replace(",", " ").split() if len(t) > 2)
    if not toks_a or not toks_b:
        return 0.0
    inter = len(toks_a & toks_b)
    union = len(toks_a | toks_b)
    return inter / union

def equality_sim(a, b):
    a, b = _to_str(a).lower(), _to_str(b).lower()
    if not a or not b:
        return 0.0
    return 1.0 if a == b else 0.0

def record_score(r1, r2):
    # SSN hard rule: if both are non-empty and identical -> strong match (flag)
    ssn1, ssn2 = _to_str(r1.get("__ssn", "")), _to_str(r2.get("__ssn", ""))
    ssn_strict_match = bool(ssn1 and ssn2 and ssn1 == ssn2)

    s_name   = name_sim(r1["__full_name"], r2["__full_name"])
    s_dob    = dob_sim(r1["__dob"], r2["__dob"])
    s_email  = email_sim(r1["__email"], r2["__email"])
    s_phone  = phone_sim(r1["__phone"], r2["__phone"])
    s_addr   = address_sim(r1["__address"], r2["__address"])
    s_gender = equality_sim(r1.get("__gender", ""), r2.get("__gender", ""))

    score = (
        WEIGHTS["name"]    * s_name
        + WEIGHTS["dob"]   * s_dob
        + WEIGHTS["email"] * s_email
        + WEIGHTS["phone"] * s_phone
        + WEIGHTS["address"] * s_addr
        + WEIGHTS["gender"]  * s_gender
    )

    details = {
        "name": s_name, "dob": s_dob, "email": s_email, "phone": s_phone,
        "address": s_addr, "gender": s_gender,
        "ssn_hard_match": 1.0 if ssn_strict_match else 0.0
    }
    return score, details, ssn_strict_match

# -----------------------------
# Blocking
# -----------------------------
def email_domain(x):
    x = _to_str(x).lower()
    return x.split("@", 1)[1] if "@" in x else ""

def phone_last(x, n=3):
    d = digits_only(x)
    return d[-n:] if len(d) >= n else ""

def last_name_prefix(x, n=2):
    x = _to_str(x).lower()
    return x[:n] if len(x) >= n else x

def build_blocks(df):
    blocks = defaultdict(list)
    for idx, r in df.iterrows():
        dob = _to_str(r["__dob"])
        if dob:
            blocks[("dob", dob)].append(idx)

        pl3 = phone_last(r["__phone"], 3)
        if pl3:
            blocks[("pl3", pl3)].append(idx)

        dom = email_domain(r["__email"])
        if dom:
            blocks[("edomain", dom)].append(idx)

        lnp = last_name_prefix(r.get("__last_name", ""), 2)
        if lnp:
            blocks[("lnp2", lnp)].append(idx)

        ssn = _to_str(r.get("__ssn", ""))
        if ssn:
            blocks[("ssn", ssn)].append(idx)
    return blocks

def candidate_pairs_from_blocks(blocks):
    cand = set()
    for _, ids in blocks.items():
        if len(ids) < 2:
            continue
        ids = sorted(ids)
        for a, b in itertools.combinations(ids, 2):
            cand.add((a, b))
    return cand

# -----------------------------
# Survivorship
# -----------------------------
def consolidate_cluster(df, indices):
    cluster_df = df.loc[indices]

    def pick_best(col):
        vals = [v for v in cluster_df[col].tolist() if pd.notna(v) and str(v).strip() != ""]
        if not vals:
            return None
        counts = Counter(vals)
        maxf = max(counts.values())
        cands = [v for v in set(vals) if counts[v] == maxf]
        return max(cands, key=lambda x: len(str(x)))

    out = {
        "patient_id": None,
        "source_record_ids": list(cluster_df["record_id"]),
        "first_name": pick_best("first_name"),
        "last_name": pick_best("last_name"),
        "gender": pick_best("gender"),
        "date_of_birth": pick_best("date_of_birth"),
        "address": pick_best("address"),
        "email": pick_best("email"),
        "phone_number": pick_best("phone_number"),
        "ssn": pick_best("ssn"),
        "full_name": pick_best("__full_name"),
        "aliases": {
            "names": sorted(set([_to_str(v) for v in cluster_df["__full_name"] if pd.notna(v)])),
            "emails": sorted(set([_to_str(v) for v in cluster_df["email"] if pd.notna(v)])),
            "phones": sorted(set([_to_str(v) for v in cluster_df["phone_number"] if pd.notna(v)])),
        }
    }
    return out

# -----------------------------
# Pipeline
# -----------------------------
def prepare_input(df):
    """Map CSV schema to internal fields used for scoring."""
    for col in ["record_id", "first_name", "last_name", "gender", "date_of_birth",
                "address", "city", "county", "ssn", "phone_number", "email", "original_record_id"]:
        if col not in df.columns:
            df[col] = ""

    df["id"] = df["record_id"]
    df["__first_name"] = df["first_name"].fillna("").astype(str).str.strip()
    df["__last_name"]  = df["last_name"].fillna("").astype(str).str.strip()
    df["__full_name"]  = (df["__first_name"] + " " + df["__last_name"]).str.strip()
    df["__dob"]   = df["date_of_birth"]
    df["__email"] = df["email"]
    df["__phone"] = df["phone_number"]
    df["__address"] = (
        df["address"].fillna("").astype(str).str.strip()
        + ", "
        + df["city"].fillna("").astype(str).str.strip()
        + ", "
        + df["county"].fillna("").astype(str).str.strip()
    ).str.replace(r"\s+,", ",", regex=True).str.replace(r"\s+", " ", regex=True).str.strip(", ").str.strip()
    df["__gender"]  = df["gender"]
    df["__ssn"]     = df["ssn"]
    df["__last_name"] = df["last_name"]
    return df

def run_pipeline(df):
    df = prepare_input(df)

    # Blocking -> candidate pairs
    blocks = build_blocks(df)
    candidates = candidate_pairs_from_blocks(blocks)

    # Score candidate pairs (rule-based)
    pairs = []
    for a, b in sorted(candidates):
        r1, r2 = df.loc[a], df.loc[b]
        score, det, ssn_match = record_score(r1, r2)

        if ssn_match:
            decision = "match"  # SSN hard
        else:
            if score >= THRESH_LINK:
                decision = "match"
            elif score >= THRESH_REVIEW:
                decision = "review"
            else:
                decision = "non-match"

        pairs.append({
            "record_id1": r1["record_id"],
            "record_id2": r2["record_id"],
            "score": round(score, 4),
            "decision": decision,
            "s_name": round(det["name"], 4),
            "s_dob": round(det["dob"], 4),
            "s_email": round(det["email"], 4),
            "s_phone": round(det["phone"], 4),
            "s_address": round(det["address"], 4),
            "s_gender": round(det["gender"], 4),
            "s_ssn_hard_match": round(det["ssn_hard_match"], 4),
            "reason": "ssn_hard" if ssn_match else ("rb_threshold" if decision == "match" else ("review_band" if decision == "review" else "below_review")),
        })

    links_df = pd.DataFrame(pairs).sort_values(["decision", "score"], ascending=[True, False])

    # Small report on review band
    if not links_df.empty:
        in_review = (links_df["decision"] == "review").sum()
        total = len(links_df)
        print(f"[RB] Review band: [{THRESH_REVIEW:.4f}, {THRESH_LINK:.4f}) "
              f"(count={in_review}, {(in_review/total)*100:.2f}% of pairs)")

    # Graph of automatic matches -> clusters
    G = nx.Graph()
    G.add_nodes_from(df["record_id"].tolist())
    for row in links_df.itertuples(index=False):
        if row.decision == "match":
            G.add_edge(row.record_id1, row.record_id2, weight=row.score)

    clusters = [sorted(list(c)) for c in nx.connected_components(G)]
    all_ids = set(df["record_id"].tolist())
    in_graph = set(itertools.chain.from_iterable(clusters))
    clusters += [[sid] for sid in sorted(list(all_ids - in_graph))]

    # Consolidation
    canonical_rows = []
    for idx, cluster_ids in enumerate(clusters, start=1):
        indices = df.index[df["record_id"].isin(cluster_ids)].tolist()
        canon = consolidate_cluster(df, indices)
        canon["patient_id"] = f"P{idx:05d}"
        canonical_rows.append(canon)

    canonical_df = pd.DataFrame(canonical_rows)

    # Map record -> patient_id in links_df
    id_to_pid = {}
    for pid, cluster_ids in zip([c["patient_id"] for c in canonical_rows], clusters):
        for rid in cluster_ids:
            id_to_pid[rid] = pid

    if not links_df.empty:
        links_df["patient_id1"] = links_df["record_id1"].map(id_to_pid.get)
        links_df["patient_id2"] = links_df["record_id2"].map(id_to_pid.get)

    return canonical_df, links_df, clusters

# -----------------------------
# CLI
# -----------------------------

def main():
    if len(sys.argv) >= 2:
        path = sys.argv[1]
        df = pd.read_csv(path, dtype=str).fillna("")
    else:
        print("Usage: python dedupe.py <input_csv_path>")
        sys.exit(1)

    canonical_df, links_df, clusters = run_pipeline(df)

    # Write outputs
    canonical_df.to_json("patients_canonical.json", orient="records", force_ascii=False, indent=2)
    canonical_df.to_csv("patients_canonical.csv", index=False)
    links_df.to_csv("patients_links.csv", index=False)

    print("Done!")
    print(f"- Found clusters: {len(clusters)}")

def suggest_ai_merge(records: List[dict]) -> dict:
    """
    Wrapper de serviciu care primeste o lista de inregistrari dintr-un cluster
    si returneaza o sugestie de fuziune generata de AI.
    """
    # Aici se poate adauga logica suplimentara, ex: logging in DB
    suggestion = get_ai_suggestion(records)
    return suggestion

if __name__ == "__main__":
    main()
