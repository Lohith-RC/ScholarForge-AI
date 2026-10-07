"""
ScholarForge AI - Academic Retrieval & Citation Engine
Connects to scholarly knowledge graphs (OpenAlex, CrossRef) for verified research grounding.
"""

import requests
import json
import re
import xml.etree.ElementTree as ET
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

def search_arxiv(query: str, limit: int = 6) -> List[Dict[str, Any]]:
    """
    Queries official arXiv API for scientific preprints and published works.
    Extremely accurate for Computer Science, Physics, Mathematics, and Machine Learning.
    """
    clean_query = re.sub(r'[^\w\s]', ' ', query).strip()
    encoded_q = "+".join(clean_query.split())
    url = f"http://export.arxiv.org/api/query?search_query=all:{encoded_q}&start=0&max_results={limit}&sortBy=relevance&sortOrder=descending"
    
    try:
        resp = requests.get(url, headers=HEADERS, timeout=12)
        if not resp.ok:
            return []
            
        root = ET.fromstring(resp.content)
        ns = {"atom": "http://www.w3.org/2005/Atom", "arxiv": "http://arxiv.org/schemas/atom"}
        entries = root.findall("atom:entry", ns)
        papers = []
        for entry in entries:
            title_elem = entry.find("atom:title", ns)
            title = " ".join(title_elem.text.split()) if title_elem is not None and title_elem.text else "Untitled Paper"
            
            summary_elem = entry.find("atom:summary", ns)
            summary = " ".join(summary_elem.text.split()) if summary_elem is not None and summary_elem.text else ""
            if len(summary) > 350:
                summary = summary[:347] + "..."
                
            published_elem = entry.find("atom:published", ns)
            year = published_elem.text[:4] if published_elem is not None and published_elem.text else "n.d."
            
            authors = []
            for author in entry.findall("atom:author", ns):
                name_elem = author.find("atom:name", ns)
                if name_elem is not None and name_elem.text:
                    authors.append(name_elem.text.strip())
                    
            id_elem = entry.find("atom:id", ns)
            arxiv_url = id_elem.text.strip() if id_elem is not None and id_elem.text else ""
            arxiv_id = arxiv_url.split("/abs/")[-1] if "/abs/" in arxiv_url else arxiv_url
            pdf_url = f"https://arxiv.org/pdf/{arxiv_id}.pdf" if arxiv_id else ""
            
            doi_elem = entry.find("arxiv:doi", ns)
            doi = doi_elem.text.strip() if doi_elem is not None and doi_elem.text else f"10.48550/arXiv.{arxiv_id}"

            papers.append({
                "id": arxiv_id or title,
                "title": title,
                "authors": authors[:5],
                "year": year,
                "citations": "arXiv Preprint",
                "doi": doi,
                "oa_url": pdf_url or arxiv_url,
                "is_oa": True,
                "abstract": summary or "Scholarly record in arXiv repository.",
                "source": "arXiv"
            })
        return papers
    except Exception as e:
        print(f"arXiv retrieval warning: {e}")
        return []

def search_semantic_scholar(query: str, limit: int = 6) -> List[Dict[str, Any]]:
    """
    Queries Semantic Scholar Academic Graph API for high-impact citations and TL;DR abstracts.
    """
    url = "https://api.semanticscholar.org/graph/v1/paper/search"
    params = {
        "query": query,
        "limit": limit,
        "fields": "title,authors,year,citationCount,openAccessPdf,abstract,externalIds"
    }
    try:
        resp = requests.get(url, params=params, headers=HEADERS, timeout=10)
        if not resp.ok:
            return []
        
        data = resp.json().get("data", [])
        papers = []
        for item in data:
            title = item.get("title") or "Untitled Paper"
            year = item.get("year") or "n.d."
            authors = [a.get("name", "") for a in item.get("authors", []) if a.get("name")]
            citations = item.get("citationCount", 0)
            ext_ids = item.get("externalIds") or {}
            doi = ext_ids.get("DOI") or ""
            oa_pdf = item.get("openAccessPdf") or {}
            oa_url = oa_pdf.get("url") or (f"https://doi.org/{doi}" if doi else "")
            abstract = item.get("abstract") or "Indexed in Semantic Scholar academic graph."
            if len(abstract) > 350:
                abstract = abstract[:347] + "..."
                
            papers.append({
                "id": item.get("paperId", "") or title,
                "title": title,
                "authors": authors[:5],
                "year": str(year),
                "citations": citations,
                "doi": doi,
                "oa_url": oa_url,
                "is_oa": bool(oa_url),
                "abstract": abstract,
                "source": "Semantic Scholar"
            })
        return papers
    except Exception as e:
        print(f"Semantic Scholar retrieval warning: {e}")
        return []

def paper_to_bibtex(paper: Dict[str, Any]) -> str:
    """
    Generates a valid BibTeX citation string for any discovered paper.
    """
    authors = " and ".join(paper.get("authors", ["ScholarForge AI"])) or "Unknown"
    title = paper.get("title", "Untitled Work").replace("{", "").replace("}", "")
    year = str(paper.get("year", "2026"))
    authors_list = paper.get("authors", [])
    first_author_surname = (authors_list[0].split()[-1]).lower() if authors_list else "scholarforge"
    first_author_surname = re.sub(r'[^a-z0-9]', '', first_author_surname) or "ref"
    cite_key = f"{first_author_surname}{year}"
    
    doi = paper.get("doi", "")
    url = paper.get("oa_url", "")
    
    fields = [
        f"  title = {{{title}}}",
        f"  author = {{{authors}}}",
        f"  year = {{{year}}}"
    ]
    if doi:
        fields.append(f"  doi = {{{doi}}}")
    if url:
        fields.append(f"  url = {{{url}}}")
    fields.append(f"  note = {{Discovered via ScholarForge AI ({paper.get('source', 'Scholarly Database')})}}")
    
    return f"@article{{{cite_key},\n" + ",\n".join(fields) + "\n}"

def search_verified_papers(query: str, limit: int = 6) -> List[Dict[str, Any]]:
    """
    Multi-engine academic retrieval combining OpenAlex, arXiv, Semantic Scholar, and CrossRef.
    Ensures high precision across all disciplines with automatic deduplication.
    """
    all_papers: List[Dict[str, Any]] = []
    seen_titles = set()

    def add_unique(papers_list: List[Dict[str, Any]]):
        for p in papers_list:
            norm_title = re.sub(r'\W+', '', p.get("title", "").lower())
            if norm_title and norm_title not in seen_titles:
                seen_titles.add(norm_title)
                all_papers.append(p)

    # 1. Primary: OpenAlex (250M+ records)
    try:
        add_unique(search_openalex(query, limit=limit))
    except Exception as e:
        print(f"OpenAlex retrieval warning: {e}")

    # 2. arXiv (Preprints in CS, AI, Math, Physics)
    if len(all_papers) < limit:
        try:
            add_unique(search_arxiv(query, limit=limit - len(all_papers)))
        except Exception as e:
            print(f"arXiv retrieval warning: {e}")

    # 3. Semantic Scholar (High-citation AI/Biomedical graph)
    if len(all_papers) < limit:
        try:
            add_unique(search_semantic_scholar(query, limit=limit - len(all_papers)))
        except Exception as e:
            print(f"Semantic Scholar retrieval warning: {e}")

    # 4. Fallback: CrossRef
    if len(all_papers) < limit:
        try:
            add_unique(search_crossref(query, limit=limit - len(all_papers)))
        except Exception as e:
            print(f"CrossRef retrieval warning: {e}")

    return all_papers[:limit]

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
