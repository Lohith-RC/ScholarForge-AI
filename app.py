import os
import uuid
import json
import shutil
from datetime import datetime
from flask import Flask, request, jsonify, send_file, render_template, redirect, url_for, flash, Response, stream_with_context
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv

load_dotenv()

# Specialized project modules
import academic_engine
import document_compiler
import google.generativeai as genai

app = Flask(__name__)
CORS(app)

app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'scholarforge-secure-dev-session-key-change-in-prod')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///database.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# --- Database Models ---

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    papers = db.relationship('Paper', backref='author', lazy=True, cascade='all, delete-orphan')
    citations = db.relationship('Citation', backref='user', lazy=True, cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class Paper(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    topic = db.Column(db.String(255), nullable=False)
    language = db.Column(db.String(50), default='English')
    citation_style = db.Column(db.String(50), default='APA')
    content = db.Column(db.Text, nullable=False)
    word_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "topic": self.topic,
            "language": self.language,
            "citation_style": self.citation_style,
            "content": self.content,
            "word_count": self.word_count,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M")
        }


class Citation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    source = db.Column(db.Text, nullable=False)
    style = db.Column(db.String(20), nullable=False)
    formatted_citation = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "source": self.source,
            "style": self.style,
            "formatted_citation": self.formatted_citation,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M")
        }


@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))


# --- Gemini Model Initialization ---

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
gemini_model = None
try:
    if GEMINI_API_KEY:
        genai.configure(api_key=GEMINI_API_KEY)
        gemini_model = genai.GenerativeModel('models/gemini-2.5-flash')
        print("ScholarForge AI: Gemini model initialized successfully.")
    else:
        print("ScholarForge AI Warning: GEMINI_API_KEY missing from environment.")
except Exception as e:
    print(f"FATAL: Error initializing Gemini model: {e}")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMP_DIR = os.path.join(BASE_DIR, 'temp_files')
if not os.path.exists(TEMP_DIR):
    os.makedirs(TEMP_DIR, exist_ok=True)


# --- Authentication Routes ---

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('serve_index'))
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        user = User.query.filter_by(username=username).first()
        if user and user.check_password(password):
            login_user(user)
            return redirect(url_for('serve_index'))
        else:
            flash('Invalid username or password.', 'danger')
    return render_template('login.html')


@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('serve_index'))
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        if not username or not password:
            flash('Please enter both username and password.', 'warning')
        elif User.query.filter_by(username=username).first():
            flash('Username already exists. Please choose another.', 'warning')
        else:
            new_user = User(username=username)
            new_user.set_password(password)
            db.session.add(new_user)
            db.session.commit()
            flash('Account created successfully! Please log in.', 'success')
            return redirect(url_for('login'))
    return render_template('register.html')


@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('You have been logged out safely.', 'info')
    return redirect(url_for('login'))


@app.route('/')
def home():
    """
    Public entry point: serves the minimal hype teaser landing page
    powered by the interactive React Bits <Dither /> retro-wave shader.
    If already logged in, seamlessly forwards to the research workstation.
    """
    if current_user.is_authenticated:
        return redirect(url_for('serve_index'))
    return render_template('landing.html')


@app.route('/teaser')
def teaser():
    """Dedicated route to experience the Dither interactive teaser."""
    return render_template('landing.html')


@app.route('/app')
@login_required
def serve_index():
    return render_template('index.html', username=current_user.username)


# --- Research Generation & Streaming Routes ---

@app.route('/generate-stream', methods=['POST'])
@login_required
def generate_stream():
    """
    Streams research paper generation via Server-Sent Events (SSE).
    Supports injecting verified literature to eliminate hallucinations.
    """
    if not gemini_model:
        return jsonify({'success': False, 'message': 'Gemini API not configured. Check GEMINI_API_KEY in .env'}), 500

    data = request.json or {}
    topic = data.get('topic', '').strip()
    language = data.get('language', 'English')
    style = data.get('style', 'APA')
    grounded_papers = data.get('grounded_papers', [])

    if not topic:
        return jsonify({'success': False, 'message': 'Please enter a research topic.'}), 400

    prompt = academic_engine.build_grounded_academic_prompt(
        topic=topic,
        language=language,
        citation_style=style,
        grounded_papers=grounded_papers
    )

    def generate():
        try:
            response_stream = gemini_model.generate_content(prompt, stream=True)
            for chunk in response_stream:
                if chunk.text:
                    payload = json.dumps({"text": chunk.text, "done": False})
                    yield f"data: {payload}\n\n"
            # Final completion event
            payload = json.dumps({"done": True})
            yield f"data: {payload}\n\n"
        except Exception as e:
            err_payload = json.dumps({"error": str(e), "done": True})
            yield f"data: {err_payload}\n\n"

    return Response(stream_with_context(generate()), mimetype='text/event-stream')


@app.route('/generate', methods=['POST'])
@login_required
def generate_paper():
    """Synchronous fallback for generating paper."""
    if not gemini_model:
        return jsonify({'success': False, 'message': 'API Key Error: Gemini model not initialized.'}), 500
    try:
        data = request.json or {}
        topic = data.get('topic', '').strip()
        language = data.get('language', 'English')
        style = data.get('style', 'APA')
        grounded_papers = data.get('grounded_papers', [])

        if not topic:
            return jsonify({'success': False, 'message': 'Please enter a research topic.'}), 400

        prompt = academic_engine.build_grounded_academic_prompt(
            topic=topic,
            language=language,
            citation_style=style,
            grounded_papers=grounded_papers
        )
        response = gemini_model.generate_content(prompt)
        return jsonify({'success': True, 'content': response.text})
    except Exception as e:
        print(f"Gemini API Error: {e}")
        return jsonify({'success': False, 'message': f'Failed to generate paper. API Error: {str(e)}'}), 500


# --- Verified Academic Literature Search ---

@app.route('/find-papers', methods=['POST'])
@login_required
def find_papers():
    """
    Retrieves verified, peer-reviewed literature from OpenAlex and CrossRef.
    Returns real papers with DOIs, author lists, citation counts, and Open Access PDF links.
    """
    try:
        data = request.json or {}
        topic = data.get('topic', '').strip()
        if not topic:
            return jsonify({'success': False, 'message': 'Please enter a topic to find papers.'}), 400

        papers = academic_engine.search_verified_papers(topic, limit=6)
        return jsonify({
            'success': True,
            'papers': papers,
            'count': len(papers)
        })
    except Exception as e:
        print(f"Scholarly Search Error: {e}")
        return jsonify({'success': False, 'message': f'Search failed: {str(e)}'}), 500


# --- Citation Engine ---

@app.route('/generate-citation', methods=['POST'])
@login_required
def generate_citation():
    """Formats source into APA, MLA, Chicago, IEEE, or BibTeX."""
    if not gemini_model:
        return jsonify({'success': False, 'message': 'Gemini model not initialized.'}), 500
    try:
        data = request.json or {}
        source = data.get('source', '').strip()
        style = data.get('style', 'APA')

        if not source:
            return jsonify({'success': False, 'message': 'Please enter source information to cite.'}), 400

        system_instruction = (
            f"You are a professional academic citation and bibliography specialist. "
            f"Your task is to parse the provided source information and format it accurately according to the {style} citation style standard. "
            f"Extract or infer all key bibliographic elements: author(s), publication date/year, title of work/article, container/journal/publisher, volume/issue, page range, and DOI or URL if applicable. "
            f"Output ONLY the single formatted citation. Do not include markdown code fences, conversational preambles, or explanations."
        )
        model_with_instruction = genai.GenerativeModel('models/gemini-2.5-flash', system_instruction=system_instruction)
        response = model_with_instruction.generate_content(f"Format this source in {style} style: '{source}'")
        citation_text = response.text.strip()

        # Automatically save citation to user library
        new_citation = Citation(
            user_id=current_user.id,
            source=source,
            style=style,
            formatted_citation=citation_text
        )
        db.session.add(new_citation)
        db.session.commit()

        return jsonify({'success': True, 'citation': citation_text, 'id': new_citation.id})
    except Exception as e:
        print(f"Citation API Error: {e}")
        return jsonify({'success': False, 'message': f'Failed to generate citation: {str(e)}'}), 500


# --- Multi-Format Document Compilation & Download ---

@app.route('/download', methods=['POST'])
@login_required
def download_paper():
    """
    Compiles and delivers manuscript in PDF, DOCX, LaTeX (.tex), Markdown, or TXT.
    Uses resilient native compilers with zero external XeLaTeX requirement.
    """
    try:
        data = request.json or {}
        markdown_content = data.get('content', '')
        download_format = data.get('format', 'pdf').lower()
        title = data.get('title', 'Research_Paper')

        if not markdown_content:
            return jsonify({'success': False, 'message': 'Manuscript content cannot be empty.'}), 400

        buffer, filename, mimetype = document_compiler.compile_research_document(
            markdown_content=markdown_content,
            output_format=download_format,
            title=title
        )

        return send_file(
            buffer,
            as_attachment=True,
            download_name=filename,
            mimetype=mimetype
        )
    except Exception as e:
        print(f"Document Compilation Error: {e}")
        return jsonify({'success': False, 'message': f'Export failed: {str(e)}'}), 500


# --- User Research Library & Saved Papers API ---

@app.route('/api/papers', methods=['GET', 'POST'])
@login_required
def manage_papers():
    if request.method == 'GET':
        papers = Paper.query.filter_by(user_id=current_user.id).order_by(Paper.updated_at.desc()).all()
        return jsonify({'success': True, 'papers': [p.to_dict() for p in papers]})

    elif request.method == 'POST':
        data = request.json or {}
        paper_id = data.get('id')
        title = data.get('title', '').strip() or "Untitled Research Draft"
        topic = data.get('topic', '').strip()
        language = data.get('language', 'English')
        style = data.get('citation_style', 'APA')
        content = data.get('content', '')
        word_count = len(content.split()) if content else 0

        if not content:
            return jsonify({'success': False, 'message': 'Paper content is empty.'}), 400

        if paper_id:
            paper = Paper.query.filter_by(id=paper_id, user_id=current_user.id).first()
            if paper:
                paper.title = title
                paper.topic = topic
                paper.language = language
                paper.citation_style = style
                paper.content = content
                paper.word_count = word_count
                paper.updated_at = datetime.utcnow()
                db.session.commit()
                return jsonify({'success': True, 'paper': paper.to_dict(), 'message': 'Paper updated successfully!'})

        # Create new
        new_paper = Paper(
            user_id=current_user.id,
            title=title,
            topic=topic,
            language=language,
            citation_style=style,
            content=content,
            word_count=word_count
        )
        db.session.add(new_paper)
        db.session.commit()
        return jsonify({'success': True, 'paper': new_paper.to_dict(), 'message': 'Paper saved to your Library!'})


@app.route('/api/papers/<int:paper_id>', methods=['GET', 'DELETE'])
@login_required
def manage_single_paper(paper_id):
    paper = Paper.query.filter_by(id=paper_id, user_id=current_user.id).first()
    if not paper:
        return jsonify({'success': False, 'message': 'Paper not found.'}), 404

    if request.method == 'GET':
        return jsonify({'success': True, 'paper': paper.to_dict()})

    elif request.method == 'DELETE':
        db.session.delete(paper)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Paper deleted from Library.'})


@app.route('/api/citations', methods=['GET'])
@login_required
def get_citations():
    citations = Citation.query.filter_by(user_id=current_user.id).order_by(Citation.created_at.desc()).all()
    return jsonify({'success': True, 'citations': [c.to_dict() for c in citations]})


@app.route('/api/citations/<int:citation_id>', methods=['DELETE'])
@login_required
def delete_citation(citation_id):
    citation = Citation.query.filter_by(id=citation_id, user_id=current_user.id).first()
    if not citation:
        return jsonify({'success': False, 'message': 'Citation not found.'}), 404
    db.session.delete(citation)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Citation deleted.'})


# --- Conversational AI Copilot ---

@app.route('/chat', methods=['POST'])
@login_required
def chat():
    if not gemini_model:
        return jsonify({"success": False, "message": "Gemini model not initialized."}), 500
    try:
        data = request.json or {}
        user_message = data.get('message', '').strip()
        history = data.get('history', [])

        if not user_message:
            return jsonify({"success": False, "message": "Message cannot be empty."}), 400

        chat_session = gemini_model.start_chat(history=history)
        response = chat_session.send_message(user_message)
        return jsonify({"success": True, "reply": response.text})
    except Exception as e:
        print(f"Chatbot API Error: {e}")
        return jsonify({"success": False, "message": f"An error occurred: {str(e)}"}), 500


def init_database():
    with app.app_context():
        db.create_all()
        # Ensure schema compatibility for user table
        try:
            with db.engine.connect() as conn:
                conn.execute(db.text("ALTER TABLE user ADD COLUMN created_at DATETIME"))
                conn.commit()
        except Exception:
            pass # Column already exists

init_database()

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, port=port)