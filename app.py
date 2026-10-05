import os
import uuid
import json
from flask import Flask, request, jsonify, send_file, render_template, redirect, url_for, flash, after_this_request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash

from dotenv import load_dotenv
load_dotenv() 

import shutil

# Resolve Pandoc executable path dynamically across OS environments
PANDOC_PATH = shutil.which("pandoc") or "C:\\Program Files\\Pandoc\\pandoc.exe"
if os.path.exists(PANDOC_PATH):
    os.environ.setdefault('PYPANDOC_PANDOC', PANDOC_PATH)

import google.generativeai as genai
import pypandoc

app = Flask(__name__)
CORS(app)

app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'scholarforge-secure-dev-session-key-change-in-prod')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///database.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(150), nullable=False)
    def set_password(self, password): self.password_hash = generate_password_hash(password)
    def check_password(self, password): return check_password_hash(self.password_hash, password)

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
gemini_model = None
try:
    if GEMINI_API_KEY:
        genai.configure(api_key=GEMINI_API_KEY)
        gemini_model = genai.GenerativeModel('models/gemini-2.5-flash')
        print("Gemini model initialized successfully.")
    else: raise ValueError("API Key is missing or not set in .env file.")
except Exception as e:
    print(f"FATAL: Error initializing Gemini model: {e}")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMP_DIR = os.path.join(BASE_DIR, 'temp_files')
if not os.path.exists(TEMP_DIR):
    os.makedirs(TEMP_DIR, exist_ok=True)

# --- Routes are unchanged except for the /find-papers prompt ---

@app.route('/login', methods=['GET', 'POST'])
def login():
    # ... (code is unchanged)
    if current_user.is_authenticated: return redirect(url_for('serve_index'))
    if request.method == 'POST':
        username, password = request.form.get('username'), request.form.get('password')
        user = User.query.filter_by(username=username).first()
        if user and user.check_password(password):
            login_user(user); return redirect(url_for('serve_index'))
        else: flash('Invalid username or password.', 'danger')
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    # ... (code is unchanged)
    if current_user.is_authenticated: return redirect(url_for('serve_index'))
    if request.method == 'POST':
        username, password = request.form.get('username'), request.form.get('password')
        if User.query.filter_by(username=username).first():
            flash('Username already exists. Please choose another.', 'warning')
        else:
            new_user = User(username=username); new_user.set_password(password)
            db.session.add(new_user); db.session.commit()
            flash('Account created successfully! Please log in.', 'success')
            return redirect(url_for('login'))
    return render_template('register.html')

@app.route('/logout')
@login_required
def logout():
    # ... (code is unchanged)
    logout_user(); return redirect(url_for('login'))

@app.route('/')
@login_required
def serve_index():
    # ... (code is unchanged)
    return render_template('index.html', username=current_user.username)

@app.route('/generate', methods=['POST'])
@login_required
def generate_paper():
    # ... (code is unchanged)
    if not gemini_model: return jsonify({'success': False, 'message': 'API Key Error: Gemini model not initialized.'}), 500
    try:
        data = request.json
        topic, language = data.get('topic'), data.get('language', 'English')
        if not topic: return jsonify({'success': False, 'message': 'Please enter a research topic.'}), 400
        system_instruction = (
            f"You are a distinguished academic researcher, peer reviewer, and scientific scholar. "
            f"Your objective is to produce a comprehensive, publication-grade academic research paper in {language} on the provided topic.\n\n"
            f"Structure the research paper systematically following formal academic conventions:\n"
            f"1. Title & Abstract: An engaging, academic title followed by a concise abstract (150-250 words) summarizing research rationale, methodology, primary findings, and broader impact, accompanied by 4-6 Index Keywords.\n"
            f"2. Introduction: Background, problem statement, research significance, and research questions/hypotheses.\n"
            f"3. Literature Review & Conceptual Framework: Synthesis of foundational scholarship, current discourse, and theoretical gaps.\n"
            f"4. Methodology / Architectural Design: Research paradigm, procedural workflows, materials/datasets, and analytical frameworks.\n"
            f"5. Results & Discussion: Rigorous examination of findings, comparative analysis with existing paradigms, and practical implications.\n"
            f"6. Limitations & Future Directions: Boundaries of the present work and proposed future research inquiries.\n"
            f"7. Conclusion: Summary of core contributions and concluding takeaways.\n"
            f"8. References: A structured bibliography in academic citation style.\n\n"
            f"Format the entire output in clean, elegant GitHub-flavored Markdown with clear headings (#, ##, ###), bullet points, and formatted equations/tables where relevant."
        )
        model_with_instruction = genai.GenerativeModel('models/gemini-2.5-flash', system_instruction=system_instruction)
        response = model_with_instruction.generate_content(f"Generate the comprehensive research paper for: {topic}.")
        return jsonify({'success': True, 'content': response.text})
    except Exception as e:
        print(f"Gemini API Error: {e}"); return jsonify({'success': False, 'message': f'Failed to generate paper. API Error: {str(e)}'}), 500

@app.route('/download', methods=['POST'])
@login_required
def download_paper():
    # ... (code is unchanged)
    data = request.json
    markdown_content, download_format = data.get('content'), data.get('format').lower()
    if not markdown_content or download_format not in ['pdf', 'docx', 'txt', 'markdown']: return jsonify({'success': False, 'message': 'Invalid format or content'}), 400
    if download_format in ['txt', 'markdown']:
        from io import BytesIO
        mimetype = 'text/markdown' if download_format == 'markdown' else 'text/plain'
        return send_file(BytesIO(markdown_content.encode('utf-8')), mimetype=mimetype, as_attachment=True, download_name=f'research_paper.{download_format}')
    unique_id = uuid.uuid4()
    temp_md_file, output_file = os.path.join(TEMP_DIR, f'temp_{unique_id}.md'), os.path.join(TEMP_DIR, f'output_{unique_id}.{download_format}')
    try:
        with open(temp_md_file, 'w', encoding='utf-8') as f: f.write(markdown_content)
        pypandoc.convert_file(source_file=temp_md_file, to=download_format, outputfile=output_file, extra_args=['--pdf-engine=xelatex', '-V', 'mainfont=Arial'])
        mimetype_map = {'pdf': 'application/pdf', 'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}
        response = send_file(output_file, as_attachment=True, download_name=f'research_paper.{download_format}', mimetype=mimetype_map.get(download_format, 'application/octet-stream'))
        @after_this_request
        def cleanup(response):
            try: os.remove(output_file)
            except OSError as e: print(f"Error cleaning up file {output_file}: {e}")
            return response
        return response
    except Exception as e:
        print(f"Pandoc Conversion Error: {e}"); return jsonify({'success': False, 'message': f'Conversion failed. Error: {str(e)}'}), 500
    finally:
        if os.path.exists(temp_md_file): os.remove(temp_md_file)

@app.route('/find-papers', methods=['POST'])
@login_required
def find_papers():
    if not gemini_model:
        return jsonify({'success': False, 'message': 'API Key Error: Gemini model not initialized.'}), 500
    try:
        data = request.json
        topic = data.get('topic')
        style = data.get('style', 'APA')
        if not topic:
            return jsonify({'success': False, 'message': 'Please enter a topic to find papers.'}), 400
        
        # --- THIS IS THE ONLY PART THAT HAS CHANGED ---
        system_instruction = (
            f"You are a specialist research librarian. Your sole task is to generate a bibliography of published research papers "
            f"based on a given topic and citation style. DO NOT explain the topic. DO NOT write any introductory text. "
            f"Your response MUST be only a numbered list of 5 to 7 citations in {style} format. The list must begin with '1.' and contain nothing else."
        )
        
        user_query = f"Generate a bibliography of research papers on the topic: {topic}"
        
        model_with_instruction = genai.GenerativeModel(
            'models/gemini-2.5-flash',
            system_instruction=system_instruction
        )
        response = model_with_instruction.generate_content(user_query)
        
        return jsonify({'success': True, 'bibliography': response.text.strip()})
    
    except Exception as e:
        print(f"Gemini Find Papers API Error: {e}")
        return jsonify({'success': False, 'message': f'Failed to find papers. API Error: {str(e)}'}), 500


@app.route('/generate-citation', methods=['POST'])
@login_required
def generate_citation():
    # ... (code is unchanged)
    if not gemini_model: return jsonify({'success': False, 'message': 'API Key Error: Gemini model not initialized.'}), 500
    try:
        data = request.json
        source, style = data.get('source'), data.get('style', 'APA')
        if not source: return jsonify({'success': False, 'message': 'Please enter source information to cite.'}), 400
        system_instruction = (
            f"You are a professional academic citation and bibliography specialist. "
            f"Your task is to parse the provided source information and format it accurately according to the {style} citation style standard. "
            f"Extract or infer all key bibliographic elements: author(s), publication date/year, title of work/article, container/journal/publisher, volume/issue, page range, and DOI or URL if applicable. "
            f"Output ONLY the single formatted citation. Do not include markdown code fences, conversational preambles, or explanations."
        )
        model_with_instruction = genai.GenerativeModel('models/gemini-2.5-flash', system_instruction=system_instruction)
        response = model_with_instruction.generate_content(f"Format this source in {style} style: '{source}'")
        return jsonify({'success': True, 'citation': response.text.strip()})
    except Exception as e:
        print(f"Gemini Citation API Error: {e}"); return jsonify({'success': False, 'message': f'Failed to generate citation. API Error: {str(e)}'}), 500

@app.route('/chat', methods=['POST'])
@login_required
def chat():
    # ... (code is unchanged)
    if not gemini_model: return jsonify({"success": False, "message": "Gemini model not initialized."}), 500
    try:
        data = request.json
        user_message, history = data.get('message'), data.get('history', [])
        if not user_message: return jsonify({"success": False, "message": "Message cannot be empty."}), 400
        chat_session = gemini_model.start_chat(history=history)
        response = chat_session.send_message(user_message)
        return jsonify({"success": True, "reply": response.text})
    except Exception as e:
        print(f"Chatbot API Error: {e}"); return jsonify({"success": False, "message": f"An error occurred: {str(e)}"}), 500

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)