"""
ScholarForge AI - Academic Retrieval & Citation Engine
Connects to scholarly knowledge graphs (OpenAlex, CrossRef) for verified research grounding.
"""

import requests
import json
import re
from typing import List, Dict, Any, Optional

OPENALEX_API_URL = "https://api.openalex.org/works"
CROSSREF_API_URL = "https://api.crossref.org/works"
USER_AGENT_EMAIL = "scholarforge.engine@gmail.com"
HEADERS = {
    "User-Agent": f"ScholarForgeAI/2.0 (mailto:{USER_AGENT_EMAIL})"
}

def reconstruct_abstract(abstract_inverted_index: Optional[Dict[str, List[int]]]) -> str:
    """
    Reconstructs human-readable abstract text from OpenAlex inverted index.
    """
    if not abstract_inverted_index:
        return ""
    word_positions = []
    for word, positions in abstract_inverted_index.items():
        for pos in positions:
            word_positions.append((pos, word))
    word_positions.sort(key=lambda x: x[0])
    return " ".join(word for _, word in word_positions)

def search_openalex(query: str, limit: int = 6) -> List[Dict[str, Any]]:
    """
    Queries OpenAlex for scholarly works matching the query.
    """
    params = {
        "search": query,
        "per-page": limit,
        "sort": "relevance_score:desc"
    }
    resp = requests.get(OPENALEX_API_URL, params=params, headers=HEADERS, timeout=12)
    if not resp.ok:
        return []
    
    results = resp.json().get("results", [])
    papers = []
    for item in results:
        title = item.get("display_name") or "Untitled Paper"
        year = item.get("publication_year") or "n.d."
        
        # Authors
        authors = []
        for authorship in item.get("authorships", []):
            author_obj = authorship.get("author", {})
            name = author_obj.get("display_name")
            if name:
                authors.append(name)
        
        # Citations & DOI
        citations = item.get("cited_by_count", 0)
        doi = item.get("doi") or ""
        
        # Open Access PDF
        oa_info = item.get("open_access", {})
        oa_url = oa_info.get("oa_url") or ""
        is_oa = oa_info.get("is_oa", False)
        
        # Abstract
        abstract = reconstruct_abstract(item.get("abstract_inverted_index"))
        if not abstract:
            # Fallback to primary location or host venue
            host = item.get("primary_location", {}).get("source", {})
            venue = host.get("display_name", "") if host else ""
            abstract = f"Published in {venue}" if venue else "Scholarly record in OpenAlex catalog."

        # Truncate abstract if too long
        if len(abstract) > 350:
            abstract = abstract[:347] + "..."

        papers.append({
            "id": item.get("id", ""),
            "title": title,
            "authors": authors[:5],
            "year": year,
            "citations": citations,
            "doi": doi,
            "oa_url": oa_url,
            "is_oa": is_oa,
            "abstract": abstract,
            "source": "OpenAlex"
        })
    return papers

def search_crossref(query: str, limit: int = 6) -> List[Dict[str, Any]]:
    """
    Queries CrossRef REST API as a resilient secondary academic database.
    """
    params = {
        "query": query,
        "rows": limit,
        "sort": "relevance"
    }
    resp = requests.get(CROSSREF_API_URL, params=params, headers=HEADERS, timeout=12)
    if not resp.ok:
        return []
    
    items = resp.json().get("message", {}).get("items", [])
    papers = []
    for item in items:
        title_list = item.get("title", [])
        title = title_list[0] if title_list else "Untitled Scholarly Work"
        
        # Year
        year = "n.d."
        issued = item.get("issued", {}).get("date-parts", [])
        if issued and issued[0] and issued[0][0]:
            year = issued[0][0]
            
        # Authors
        authors = []
        for author in item.get("author", []):
            family = author.get("family", "")
            given = author.get("given", "")
            if family and given:
                authors.append(f"{given} {family}")
            elif family:
                authors.append(family)

        citations = item.get("is-referenced-by-count", 0)
        doi_val = item.get("DOI", "")
        doi_url = f"https://doi.org/{doi_val}" if doi_val else ""
        
        # Link or landing page
        url = item.get("URL") or doi_url
        
        papers.append({
            "id": doi_val or title,
            "title": title,
            "authors": authors[:5],
            "year": year,
            "citations": citations,
            "doi": doi_url,
            "oa_url": url,
            "is_oa": bool(item.get("link")),
            "abstract": f"Indexed by CrossRef. Container: {item.get('container-title', [''])[0]}",
            "source": "CrossRef"
        })
    return papers

def search_verified_papers(query: str, limit: int = 6) -> List[Dict[str, Any]]:
    """
    Orchestrates academic retrieval with fallback mechanism.
    """
    try:
        papers = search_openalex(query, limit)
        if papers:
            return papers
    except Exception as e:
        print(f"OpenAlex retrieval warning: {e}")
        
    try:
        papers = search_crossref(query, limit)
        if papers:
            return papers
    except Exception as e:
        print(f"CrossRef retrieval warning: {e}")
        
    return []

def build_grounded_academic_prompt(topic: str, language: str = "English", citation_style: str = "APA", grounded_papers: Optional[List[Dict[str, Any]]] = None) -> str:
    """
    Constructs an enriched system prompt for the Gemini generator, injecting
    verified academic citations to prevent hallucinations.
    """
    literature_context = ""
    if grounded_papers and len(grounded_papers) > 0:
        literature_context = "\n### GROUNDED PEER-REVIEWED LITERATURE BASE (MANDATORY TO CITE):\n"
        for idx, paper in enumerate(grounded_papers, 1):
            authors_str = ", ".join(paper.get("authors", [])) or "et al."
            year = paper.get("year", "n.d.")
            title = paper.get("title", "")
            doi = paper.get("doi", "")
            literature_context += f"[{idx}] {authors_str} ({year}). \"{title}\". DOI: {doi}\n"
        literature_context += (
            "\nINSTRUCTION ON CITATIONS: You MUST integrate and cite these real publications within "
            f"the Literature Review, Methodology, and Discussion using standard in-text {citation_style} format. "
            "Include them in the final References section with their accurate DOIs."
        )

    prompt = (
        f"You are a distinguished academic researcher, university professor, and senior peer reviewer. "
        f"Your task is to author a publication-grade, rigorous academic research paper on the topic: '{topic}' in {language}.\n\n"
        f"CITATION STYLE: Strict {citation_style} format.\n"
        f"{literature_context}\n\n"
        f"MANDATORY MANUSCRIPT STRUCTURE:\n"
        f"# [Title: A Captivating, Formal Academic Title]\n\n"
        f"**Author:** ScholarForge AI Academic Workspace\n\n"
        f"### Abstract\n"
        f"A 200-250 word scholarly abstract summarizing problem background, methodology, key findings, and practical implications.\n\n"
        f"**Keywords:** 5-6 academic index keywords separated by commas.\n\n"
        f"## 1. Introduction\n"
        f"- Theoretical background & context\n"
        f"- Problem statement & current domain challenges\n"
        f"- Research objectives and targeted contributions\n\n"
        f"## 2. Literature Review & Theoretical Framework\n"
        f"- Critical synthesis of existing literature\n"
        f"- Identified research gaps\n\n"
        f"## 3. Methodology & System Architecture\n"
        f"- Research paradigm / analytical model / system architecture\n"
        f"- Data collection, formal parameters, or empirical procedures\n"
        f"- Evaluation metrics and experimental setup\n\n"
        f"## 4. Results & Empirical Analysis\n"
        f"- Detailed findings and comparative evaluations\n"
        f"- Markdown tables summarizing metrics/benchmarks\n"
        f"- Mathematical equations formatted in standard LaTeX ($...$ and $$...$$)\n\n"
        f"## 5. Discussion & Implications\n"
        f"- Theoretical significance & practical applicability\n"
        f"- Critical analysis of unexpected outcomes\n\n"
        f"## 6. Limitations & Future Directions\n"
        f"- Methodological and contextual boundaries\n"
        f"- Prospective research avenues\n\n"
        f"## 7. Conclusion\n"
        f"- Summary of core discoveries\n\n"
        f"## References\n"
        f"- Comprehensive bibliography formatted strictly in {citation_style} style.\n\n"
        f"Output exclusively in high-fidelity GitHub Flavored Markdown with clean typography, tables, and standard mathematical notation."
    )
    return prompt
