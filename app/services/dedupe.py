import sys

import numpy as np
import pandas as pd
from rapidfuzz import fuzz

# =============================
# Config
# =============================
DEFAULT_K     = 100    # ANN neighbors per record

LINK_T   = 0.85   # scor >= LINK_T => "match" (se leagă în graf)
REVIEW_T = 0.70   # REVIEW_T <= scor < LINK_T => "review"

# =============================
# Similarity utils
# =============================
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

def email_domain(x):
    x = _to_str(x).lower()
    return x.split("@", 1)[1] if "@" in x else ""

# ---- Gender normalize + sim ----
def _norm_gender(x: str) -> str:
    """Normalizează gender la {m,f,o}; empty dacă necunoscut."""
    g = _to_str(x).lower()
    if not g:
        return ""
    if g in {"m", "male", "masculin", "masc", "b"}:
        return "m"
    if g in {"f", "female", "feminin", "fem"}:
        return "f"
    if g in {"o", "other", "alt", "non-binary", "nonbinary", "nb"}:
        return "o"
    if g and g[0] in {"m","f","o"}:
        return g[0]
    return ""

def gender_sim(a, b) -> float:
    ga, gb = _norm_gender(a), _norm_gender(b)
    if not ga or not gb:
        return 0.0
    return 1.0 if ga == gb else 0.0

# =============================
# Input preparation
# =============================
def prepare_input(df):
    """Maps CSV schema to internal fields used in scoring/embedding."""
    for col in ["record_id", "first_name", "last_name", "gender", "date_of_birth",
                "address", "city", "county", "ssn", "phone_number", "email", "original_record_id"]:
        if col not in df.columns:
            df[col] = ""

    df["id"] = df["record_id"]
    df["__first_name"] = df["first_name"].fillna("").astype(str).str.strip()
    df["__last_name"]  = df["last_name"].fillna("").astype(str).str.strip()
    df["__full_name"]  = (df["__first_name"] + " " + df["__last_name"]).str.strip()
    df["__dob"]     = df["date_of_birth"]
    df["__email"]   = df["email"]
    df["__phone"]   = df["phone_number"]
    df["__gender"]  = df["gender"]  # păstrăm originalul și vom normaliza la comparare
    df["__address"] = (
        df["address"].fillna("").astype(str).str.strip()
        + ", "
        + df["city"].fillna("").astype(str).str.strip()
        + ", "
        + df["county"].fillna("").astype(str).str.strip()
    ).str.replace(r"\s+,", ",", regex=True).str.replace(r"\s+", " ", regex=True).str.strip(", ").str.strip()
    df["__ssn"]     = df["ssn"]
    return df

# =============================
# Text for embedding
# =============================
def rec_to_text(r):
    parts = [
        _to_str(r["__full_name"]).lower(),
        _to_str(r["__email"]).lower(),
        digits_only(r["__phone"])[-7:],     # last 7 digits help with proximity
        _to_str(r["__address"]).lower(),
        _to_str(r["__dob"]).lower(),
        # gender NU intră în embedding
    ]
    return " | ".join([p for p in parts if p])

# =============================
# Embedder: TF-IDF char n-grams
# =============================
from sklearn.feature_extraction.text import TfidfVectorizer

class Embedder:
    def __init__(self):
        self.vec = TfidfVectorizer(analyzer="char", ngram_range=(3,5), min_df=1)

    @property
    def mode(self):
        return "tfidf"

    def fit_transform(self, texts):
        X = self.vec.fit_transform(texts).astype(np.float32)
        return X  # CSR sparse

    def transform(self, texts):
        return self.vec.transform(texts).astype(np.float32)

# =============================
# ANN on sparse: NearestNeighbors (cosine)
# =============================
from sklearn.neighbors import NearestNeighbors

def build_ann(embs):
    nn = NearestNeighbors(n_neighbors=DEFAULT_K+1, metric="cosine", algorithm="brute")
    nn.fit(embs)
    return nn

def ann_search(index, embs, k):
    D, I = index.kneighbors(embs, n_neighbors=k, return_distance=True)
    return D, I

def build_candidates(index, embs, ids, k=DEFAULT_K):
    D, I = ann_search(index, embs, k=k+1)  # include self
    cand = set()
    n = len(ids)
    for i in range(n):
        rid1 = ids[i]
        for j in I[i][1:]:  # skip self
            rid2 = ids[j]
            if rid1 < rid2:
                cand.add((rid1, rid2))
            else:
                cand.add((rid2, rid1))
    return cand

# =============================
# Feature engineering on pairs
# =============================
FEATURE_ORDER = ["sim_name","sim_email","sim_phone4","sim_addr","sim_dob",
                 "same_domain","cos_emb","same_gender","ssn_hard"]

from sklearn.metrics.pairwise import cosine_similarity

def pair_features(r1, r2, emb1_row, emb2_row):
    f = {}
    f["sim_name"]    = name_sim(r1["__full_name"], r2["__full_name"])
    f["sim_email"]   = email_sim(r1["__email"], r2["__email"])
    f["sim_phone4"]  = phone_sim(r1["__phone"], r2["__phone"], last_digits=4)
    f["sim_addr"]    = address_sim(r1["__address"], r2["__address"])
    f["sim_dob"]     = dob_sim(r1["__dob"], r2["__dob"])
    f["same_domain"] = 1.0 if email_domain(r1["__email"]) == email_domain(r2["__email"]) else 0.0
    f["cos_emb"]     = float(cosine_similarity(emb1_row, emb2_row)[0,0])
    f["same_gender"] = gender_sim(r1.get("__gender",""), r2.get("__gender",""))
    f["ssn_hard"]    = 1.0 if (_to_str(r1.get("__ssn","")) != "" and _to_str(r1["__ssn"]) == _to_str(r2.get("__ssn",""))) else 0.0
    return f

# =============================
# Heuristic scoring
# =============================
WEIGHTS = {
    "sim_name":    0.28,
    "sim_email":   0.24,
    "sim_phone4":  0.10,
    "sim_addr":    0.14,
    "sim_dob":     0.12,
    "same_domain": 0.02,
    "cos_emb":     0.08,  # redus de la 0.10 ca să încape same_gender
    "same_gender": 0.02,
}

def pair_score_heuristic(feats: dict) -> float:
    s = 0.0
    for k, w in WEIGHTS.items():
        s += w * float(feats.get(k, 0.0))
    if feats.get("same_domain", 0.0) == 1.0 and feats.get("sim_name", 0.0) >= 0.90:
        s = min(1.0, s + 0.02)
    return float(s)

# =============================
# Scorare perechi & decizie
# =============================
def score_pairs(pairs, df, embs, id_to_idx):
    rows = []
    for rid1, rid2 in pairs:
        if rid1 == rid2:
            continue
        r1 = df.loc[df["record_id"]==rid1].iloc[0]
        r2 = df.loc[df["record_id"]==rid2].iloc[0]
        e1 = embs[id_to_idx[rid1]]
        e2 = embs[id_to_idx[rid2]]
        feats = pair_features(r1, r2, e1, e2)

        if feats["ssn_hard"] == 1.0:
            decision = "match"; reason = "ssn_hard"; score = 1.0
        else:
            score = pair_score_heuristic(feats)
            if score >= LINK_T:
                decision = "match";  reason = "heur_link"
            elif score >= REVIEW_T:
                decision = "review"; reason = "heur_review"
            else:
                decision = "non-match"; reason = "heur_below"

        rows.append({
            # record_id* = ID-urile înregistrărilor
            "record_id1": rid1,
            "record_id2": rid2,
            # patient_id* se vor adăuga după clusterizare
            "score": round(score, 4),
            "decision": decision,
            "s_name": round(feats["sim_name"], 4),
            "s_dob": round(feats["sim_dob"], 4),
            "s_email": round(feats["sim_email"], 4),
            "s_phone": round(feats["sim_phone4"], 4),
            "s_address": round(feats["sim_addr"], 4),
            "s_gender": round(feats["same_gender"], 4),
            "s_ssn_hard_match": round(feats["ssn_hard"], 4),
            "reason": reason,
        })

    links_df = pd.DataFrame(rows).sort_values(["decision", "score"], ascending=[True, False])
    return links_df

# =============================
# Clustering prin componente conexe (union-find)
# =============================
class UnionFind:
    def __init__(self):
        self.parent = {}
        self.rank = {}

    def find(self, x):
        if self.parent.get(x, x) != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent.get(x, x)

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb: return
        if self.rank.get(ra, 0) < self.rank.get(rb, 0):
            ra, rb = rb, ra
        self.parent[rb] = ra
        if self.rank.get(ra, 0) == self.rank.get(rb, 0):
            self.rank[ra] = self.rank.get(ra, 0) + 1

    def add(self, x):
        if x not in self.parent:
            self.parent[x] = x
            self.rank[x] = 0

def cluster_records(df, links_df):
    """
    Creează clustere din perechile cu decision == 'match'.
    Returnează clusters_df: record_id, cluster_id, patient_id, cluster_size.
    """
    uf = UnionFind()
    for rid in df["record_id"]:
        uf.add(rid)

    # Unim doar muchiile marcate ca "match"
    for _, row in links_df.iterrows():
        if row["decision"] == "match":
            uf.union(row["record_id1"], row["record_id2"])

    # Construim cluster IDs compacte
    roots = {}
    cluster_idx = 0
    cluster_id = []
    for rid in df["record_id"]:
        r = uf.find(rid)
        if r not in roots:
            roots[r] = f"C{cluster_idx:06d}"
            cluster_idx += 1
        cluster_id.append(roots[r])

    clusters_df = pd.DataFrame({
        "record_id": df["record_id"],
        "cluster_id": cluster_id,
    })

    # mărimea clusterului
    sizes = clusters_df.groupby("cluster_id")["record_id"].transform("count")
    clusters_df["cluster_size"] = sizes

    # mapăm fiecare cluster_id la un patient_id de forma P00001
    unique_clusters = clusters_df["cluster_id"].drop_duplicates().sort_values().tolist()
    c2pid = {cid: f"P{ix+1:05d}" for ix, cid in enumerate(unique_clusters)}
    clusters_df["patient_id"] = clusters_df["cluster_id"].map(c2pid)

    # ordonare
    return clusters_df.sort_values(
        ["cluster_size","cluster_id","record_id"], ascending=[False, True, True]
    )

# =============================
# Main pipeline (cu clustering)
# =============================
def run_pipeline(df, k_neighbors=DEFAULT_K):
    """
    Returns: links_df, clusters_df
    """
    df = prepare_input(df)

    # 1) Embedding TF-IDF char (neschimbat)
    texts = [rec_to_text(r) for _, r in df.iterrows()]
    embedder = Embedder()
    embs = embedder.fit_transform(texts)   # CSR

    # map record_id -> index
    ids = df["record_id"].tolist()
    id_to_idx = {rid: i for i, rid in enumerate(ids)}

    # 2) ANN candidates (neschimbat)
    index = build_ann(embs)
    candidates = build_candidates(index, embs, ids, k=k_neighbors)

    # 3) Scorare euristică pe perechi + decizie
    links_df = score_pairs(candidates, df, embs, id_to_idx)

    # 4) Clustering pe muchiile "match"
    clusters_df = cluster_records(df, links_df)

    # 4.1) Atașăm patient_id1/2 (clusterele) în links_df
    rec2pid = dict(zip(clusters_df["record_id"], clusters_df["patient_id"]))
    links_df["patient_id1"] = links_df["record_id1"].map(rec2pid)
    links_df["patient_id2"] = links_df["record_id2"].map(rec2pid)

    # opțional: reordonăm coloanele pentru lizibilitate
    cols_order = [
        "patient_id1","patient_id2",
        "record_id1","record_id2",
        "score","decision",
        "s_name","s_dob","s_email","s_phone","s_address","s_gender",
        "s_ssn_hard_match","reason",
    ]
    links_df = links_df[[c for c in cols_order if c in links_df.columns]]

    # 5) Raport review band (opțional)
    if not links_df.empty:
        in_review = (links_df["decision"] == "review").sum()
        total = len(links_df)
        print(f"[Heur] Review band: [{REVIEW_T:.4f}, {LINK_T:.4f}) "
              f"(count={in_review}, {(in_review/total)*100:.2f}% din perechi)")

    return links_df, clusters_df

# =============================
# CLI
# =============================
def main():
    if len(sys.argv) >= 2:
        path = sys.argv[1]
        df = pd.read_csv(path, dtype=str).fillna("")
    else:
        print("Usage: python dedupe_ml.py <input_csv_path>")
        sys.exit(1)

    links_df, clusters_df = run_pipeline(df)

    # output: links + clusters
    links_df.to_csv("patients_links.csv", index=False)
    clusters_df.to_csv("patients_clusters.csv", index=False)

    print("Done!")
    print(f"- Evaluated pairs: {len(links_df)}")
    print(f"- Clusters: {clusters_df['cluster_id'].nunique()} "
          f"(med size ~ {clusters_df['cluster_size'].mean():.2f})")

if __name__ == "__main__":
    main()
