"""
ScholarForge AI - Document Compiler
Compiles Markdown research papers into PDF, DOCX, LaTeX, Markdown, and TXT.
Features zero-failure fallback: uses native python-docx and reportlab when Pandoc is unavailable.
"""

import os
import re
import io
import shutil
from typing import Tuple

# Attempt to configure pandoc if binary exists
PANDOC_BIN = shutil.which("pandoc") or "C:\\Program Files\\Pandoc\\pandoc.exe"
PANDOC_AVAILABLE = bool(os.path.exists(PANDOC_BIN) if isinstance(PANDOC_BIN, str) else False)
if PANDOC_AVAILABLE:
    os.environ.setdefault('PYPANDOC_PANDOC', PANDOC_BIN)

try:
    import pypandoc
except ImportError:
    pypandoc = None

try:
    import docx
    from docx.shared import Inches, Pt, RGBColor
    from docx.enum.text import WD_ALIGN_PARAGRAPH
except ImportError:
    docx = None

try:
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle
    from reportlab.pdfgen import canvas
except ImportError:
    SimpleDocTemplate = None


class NumberedCanvas(canvas.Canvas):
    """Adds running headers and page numbers (Page X of Y) to ReportLab PDFs."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            super().showPage()
        super().save()

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#666666"))
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(letter[0] - 54, 36, page_str)
        self.drawString(54, 36, "ScholarForge AI Academic Workspace — Confidential Research Draft")
        self.setStrokeColor(colors.HexColor("#dddddd"))
        self.setLineWidth(0.5)
        self.line(54, 48, letter[0] - 54, 48)
        self.restoreState()


def clean_markdown_for_text(md: str) -> str:
    """Strips Markdown syntax for clean plain text export."""
    text = re.sub(r'#+\s*', '', md)
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
    text = re.sub(r'\*(.*?)\*', r'\1', text)
    text = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', text)
    text = re.sub(r'`(.*?)`', r'\1', text)
    return text


def markdown_to_latex(md: str, title: str = "Research Paper") -> str:
    """Converts Markdown text into a fully-formed academic LaTeX document."""
    latex_body = md
    # Basic heading replacements
    latex_body = re.sub(r'^# (.*?)$', r'\\section*{\1}', latex_body, flags=re.MULTILINE)
    latex_body = re.sub(r'^## (.*?)$', r'\\section{\1}', latex_body, flags=re.MULTILINE)
    latex_body = re.sub(r'^### (.*?)$', r'\\subsection{\1}', latex_body, flags=re.MULTILINE)
    latex_body = re.sub(r'^#### (.*?)$', r'\\subsubsection{\1}', latex_body, flags=re.MULTILINE)
    # Bold and italics
    latex_body = re.sub(r'\*\*(.*?)\*\*', r'\\textbf{\1}', latex_body)
    latex_body = re.sub(r'\*(.*?)\*', r'\\textit{\1}', latex_body)
    
    latex_doc = f"""\\documentclass[11pt,a4paper]{{article}}
\\usepackage[utf8]{{inputenc}}
\\usepackage[margin=1in]{{geometry}}
\\usepackage{{amsmath,amssymb}}
\\usepackage{{graphicx}}
\\usepackage{{hyperref}}
\\usepackage{{cite}}
\\usepackage{{microtype}}
\\usepackage{{booktabs}}

\\title{{\\textbf{{{title}}}}}
\\author{{ScholarForge AI Academic Workspace}}
\\date{{\\today}}

\\begin{{document}}
\\maketitle

{latex_body}

\\end{{document}}
"""
    return latex_doc


def compile_docx_native(markdown_content: str, title: str = "Research Paper") -> io.BytesIO:
    """Creates a Microsoft Word (.docx) document natively without Pandoc."""
    doc = docx.Document()
    
    # Configure 1-inch margins
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)

    lines = markdown_content.split('\n')
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
            
        if stripped.startswith('# '):
            p = doc.add_heading(stripped[2:], level=1)
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        elif stripped.startswith('## '):
            doc.add_heading(stripped[3:], level=2)
        elif stripped.startswith('### '):
            doc.add_heading(stripped[4:], level=3)
        elif stripped.startswith('#### '):
            doc.add_heading(stripped[5:], level=4)
        elif stripped.startswith('- ') or stripped.startswith('* '):
            clean_item = re.sub(r'\*\*(.*?)\*\*', r'\1', stripped[2:])
            doc.add_paragraph(clean_item, style='List Bullet')
        elif re.match(r'^\d+\.\s', stripped):
            clean_item = re.sub(r'\*\*(.*?)\*\*', r'\1', re.sub(r'^\d+\.\s*', '', stripped))
            doc.add_paragraph(clean_item, style='List Number')
        elif stripped.startswith('> '):
            p = doc.add_paragraph(stripped[2:], style='Quote')
        else:
            p = doc.add_paragraph()
            # Simple bold parsing
            parts = re.split(r'(\*\*.*?\*\*)', stripped)
            for part in parts:
                if part.startswith('**') and part.endswith('**'):
                    run = p.add_run(part[2:-2])
                    run.bold = True
                else:
                    p.add_run(part)

    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer


def compile_pdf_reportlab(markdown_content: str, title: str = "Research Paper") -> io.BytesIO:
    """Generates a publication-grade academic PDF using ReportLab with clean typography."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )
    
    styles = getSampleStyleSheet()
    
    # Custom academic styles
    title_style = ParagraphStyle(
        'AcademicTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0f172a'),
        alignment=1, # Center
        spaceAfter=12
    )
    
    meta_style = ParagraphStyle(
        'AcademicMeta',
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#475569'),
        alignment=1, # Center
        spaceAfter=18
    )

    h1_style = ParagraphStyle(
        'AcademicH1',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#0f172a'),
        spaceBefore=16,
        spaceAfter=8,
        keepWithNext=True
    )
    
    h2_style = ParagraphStyle(
        'AcademicH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1e293b'),
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'AcademicBody',
        parent=styles['Normal'],
        fontName='Times-Roman',
        fontSize=10.5,
        leading=15,
        textColor=colors.HexColor('#1e293b'),
        alignment=4, # Justified
        spaceAfter=8
    )
    
    bullet_style = ParagraphStyle(
        'AcademicBullet',
        parent=styles['Normal'],
        fontName='Times-Roman',
        fontSize=10,
        leading=14,
        leftIndent=15,
        spaceAfter=4
    )

    story = []
    
    lines = markdown_content.split('\n')
    is_first_header = True
    
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
            
        # Clean inline markdown for reportlab (support <b>, <i>)
        formatted = stripped
        formatted = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', formatted)
        formatted = re.sub(r'\*(.*?)\*', r'<i>\1</i>', formatted)
        # Escape raw ampersands not part of entities
        formatted = re.sub(r'&(?!(?:amp|lt|gt|quot|apos);)', '&amp;', formatted)
        
        if stripped.startswith('# '):
            text = formatted[2:]
            if is_first_header:
                story.append(Paragraph(text, title_style))
                story.append(Paragraph("ScholarForge AI Academic Workspace &bull; Automated Research Manuscript", meta_style))
                story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cbd5e1"), spaceAfter=14))
                is_first_header = False
            else:
                story.append(Paragraph(text, h1_style))
        elif stripped.startswith('## '):
            story.append(Paragraph(formatted[3:], h1_style))
        elif stripped.startswith('### '):
            story.append(Paragraph(formatted[4:], h2_style))
        elif stripped.startswith('- ') or stripped.startswith('* '):
            story.append(Paragraph(f"&bull; {formatted[2:]}", bullet_style))
        elif re.match(r'^\d+\.\s', stripped):
            clean_item = re.sub(r'^\d+\.\s*', '', formatted)
            story.append(Paragraph(f"{stripped[:2]} {clean_item}", bullet_style))
        else:
            story.append(Paragraph(formatted, body_style))

    doc.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer


def compile_research_document(markdown_content: str, output_format: str, title: str = "Research_Paper") -> Tuple[io.BytesIO, str, str]:
    """
    Unified entry point for document compilation.
    Returns: (buffer, filename, mimetype)
    """
    fmt = output_format.lower().strip()
    safe_title = re.sub(r'[^a-zA-Z0-9_\-]', '_', title)[:40] or "Research_Paper"

    if fmt in ['md', 'markdown']:
        buffer = io.BytesIO(markdown_content.encode('utf-8'))
        return buffer, f"{safe_title}.md", 'text/markdown'
        
    elif fmt in ['txt', 'text']:
        clean_text = clean_markdown_for_text(markdown_content)
        buffer = io.BytesIO(clean_text.encode('utf-8'))
        return buffer, f"{safe_title}.txt", 'text/plain'
        
    elif fmt in ['latex', 'tex']:
        tex_content = markdown_to_latex(markdown_content, title=title)
        buffer = io.BytesIO(tex_content.encode('utf-8'))
        return buffer, f"{safe_title}.tex", 'application/x-tex'

    elif fmt in ['docx', 'word']:
        if docx:
            buffer = compile_docx_native(markdown_content, title=title)
            return buffer, f"{safe_title}.docx", 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        else:
            buffer = io.BytesIO(markdown_content.encode('utf-8'))
            return buffer, f"{safe_title}.md", 'text/markdown'

    elif fmt == 'pdf':
        # First attempt reportlab for reliable, beautiful, zero-dependency PDF rendering
        if SimpleDocTemplate:
            try:
                buffer = compile_pdf_reportlab(markdown_content, title=title)
                return buffer, f"{safe_title}.pdf", 'application/pdf'
            except Exception as e:
                print(f"ReportLab PDF error, falling back: {e}")
                
        # If reportlab fails and pandoc is installed, try pypandoc
        if PANDOC_AVAILABLE and pypandoc:
            try:
                import tempfile
                with tempfile.NamedTemporaryFile('w', suffix='.md', delete=False, encoding='utf-8') as f:
                    f.write(markdown_content)
                    temp_md = f.name
                temp_pdf = temp_md.replace('.md', '.pdf')
                pypandoc.convert_file(temp_md, 'pdf', outputfile=temp_pdf, extra_args=['--pdf-engine=xelatex'])
                with open(temp_pdf, 'rb') as f:
                    pdf_bytes = f.read()
                os.remove(temp_md)
                os.remove(temp_pdf)
                return io.BytesIO(pdf_bytes), f"{safe_title}.pdf", 'application/pdf'
            except Exception as pe:
                print(f"Pandoc PDF error: {pe}")
                
        # Graceful fallback to formatted markdown
        buffer = io.BytesIO(markdown_content.encode('utf-8'))
        return buffer, f"{safe_title}.md", 'text/markdown'

    else:
        buffer = io.BytesIO(markdown_content.encode('utf-8'))
        return buffer, f"{safe_title}.txt", 'text/plain'
