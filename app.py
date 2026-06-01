import os
import re
import json
from datetime import datetime
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
from PIL import Image
import easyocr
import requests
from werkzeug.utils import secure_filename
import io

app = Flask(__name__)
CORS(app)

# Configurazione
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# Inizializza OCR reader
reader = easyocr.Reader(['en', 'it'], gpu=False)

def allowed_file(filename):
    """Verifica se il file è un'immagine valida"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_isbn_from_text(text):
    """
    Estrae ISBN-10 o ISBN-13 da un testo
    ISBN-13: 978/979 seguiti da 10 cifre
    ISBN-10: 10 cifre
    """
    # Pattern per ISBN-13
    isbn13_pattern = r'(?:ISBN(?:-13)?[:\s]?)?(?=[-0-9 ]{17}$|(?:(?=(?:[0-9]+[-\s]){3})[-\s0-9]{13}$|(?:(?=(?:[0-9]+[-\s]){4})[-\s0-9]{17}$|[0-9]{13}$))(?:97[89])?[0-9]{10}(?:(?=(?:[0-9]+[-\s]){2})[-\s0-9]{2}$|[0-9]{2}$|(?=[0-9]*[a-z])[0-9]*[a-z]+[0-9]*$|-[0-9]+$))'
    
    # Pattern semplice per ISBN-13 (978/979 + 10 cifre)
    isbn13_simple = r'(?:978|979)[0-9]{10}'
    
    # Pattern per ISBN-10
    isbn10_pattern = r'[0-9]{10}(?:[xX]|$)'
    
    # Cerca ISBN-13
    match = re.search(isbn13_simple, text)
    if match:
        return match.group(0)
    
    # Cerca ISBN-10
    match = re.search(isbn10_pattern, text)
    if match:
        isbn = match.group(0).rstrip('xX')
        if len(isbn) == 10:
            return isbn
    
    return None

def search_book_google_books(isbn):
    """Ricerca libro su Google Books API"""
    try:
        url = f"https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}"
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('totalItems', 0) > 0:
                book_info = data['items'][0]['volumeInfo']
                return {
                    'source': 'Google Books',
                    'title': book_info.get('title', 'N/A'),
                    'authors': ', '.join(book_info.get('authors', ['N/A'])),
                    'publisher': book_info.get('publisher', 'N/A'),
                    'published_date': book_info.get('publishedDate', 'N/A'),
                    'description': book_info.get('description', 'No description available'),
                    'image_url': book_info.get('imageLinks', {}).get('thumbnail', ''),
                    'preview_link': book_info.get('previewLink', ''),
                    'isbn': isbn
                }
    except Exception as e:
        print(f"Google Books error: {e}")
    
    return None

def search_book_openlibrary(isbn):
    """Ricerca libro su OpenLibrary API"""
    try:
        url = f"https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&jio=1&format=json"
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            if data:
                book_key = list(data.keys())[0]
                book_info = data[book_key]
                
                return {
                    'source': 'OpenLibrary',
                    'title': book_info.get('title', 'N/A'),
                    'authors': ', '.join([a.get('name', 'N/A') for a in book_info.get('authors', [])]),
                    'publisher': ', '.join(book_info.get('publishers', ['N/A'])),
                    'published_date': book_info.get('publish_date', 'N/A'),
                    'description': 'Available on OpenLibrary',
                    'image_url': book_info.get('cover', {}).get('medium', ''),
                    'preview_link': f"https://openlibrary.org/isbn/{isbn}",
                    'isbn': isbn
                }
    except Exception as e:
        print(f"OpenLibrary error: {e}")
    
    return None

@app.route('/')
def index():
    """Pagina principale"""
    return render_template('index.html')

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """API per upload e elaborazione immagine"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type. Allowed: png, jpg, jpeg, gif'}), 400
        
        # Leggi immagine
        image_stream = io.BytesIO(file.read())
        image = Image.open(image_stream)
        image_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        # Estrai testo con OCR
        print("Extracting text with OCR...")
        results = reader.readtext(image_cv)
        extracted_text = ' '.join([text[1] for text in results])
        
        print(f"Extracted text: {extracted_text}")
        
        # Estrai ISBN
        isbn = extract_isbn_from_text(extracted_text)
        
        if not isbn:
            return jsonify({
                'error': 'No ISBN found in the image',
                'extracted_text': extracted_text
            }), 400
        
        # Ricerca libro
        book_data = search_book_google_books(isbn) or search_book_openlibrary(isbn)
        
        if not book_data:
            return jsonify({
                'error': 'Book not found',
                'isbn': isbn,
                'extracted_text': extracted_text
            }), 404
        
        # Salva nella cronologia (opzionale)
        save_to_history(book_data)
        
        return jsonify({
            'success': True,
            'isbn': isbn,
            'book': book_data,
            'extracted_text': extracted_text
        }), 200
    
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/search', methods=['POST'])
def search_isbn():
    """API per ricerca diretto per ISBN"""
    try:
        data = request.get_json()
        isbn = data.get('isbn', '').strip()
        
        if not isbn:
            return jsonify({'error': 'ISBN not provided'}), 400
        
        # Ricerca libro
        book_data = search_book_google_books(isbn) or search_book_openlibrary(isbn)
        
        if not book_data:
            return jsonify({'error': 'Book not found'}), 404
        
        save_to_history(book_data)
        
        return jsonify({
            'success': True,
            'book': book_data
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/history', methods=['GET'])
def get_history():
    """Ottieni cronologia ricerche"""
    try:
        if os.path.exists('history.json'):
            with open('history.json', 'r') as f:
                history = json.load(f)
            return jsonify(history), 200
        return jsonify([]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def save_to_history(book_data):
    """Salva libro nella cronologia"""
    try:
        history = []
        if os.path.exists('history.json'):
            with open('history.json', 'r') as f:
                history = json.load(f)
        
        book_entry = {
            'isbn': book_data['isbn'],
            'title': book_data['title'],
            'authors': book_data['authors'],
            'timestamp': datetime.now().isoformat(),
            'source': book_data['source']
        }
        
        history.insert(0, book_entry)
        history = history[:50]  # Mantieni ultimi 50
        
        with open('history.json', 'w') as f:
            json.dump(history, f, indent=2)
    except Exception as e:
        print(f"Error saving history: {e}")

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)