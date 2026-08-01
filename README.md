# 📚 Book ISBN Finder

Un'applicazione web che consente di trovare libri a partire da una foto della copertina, estraendo l'ISBN e ricercandolo in database online.

## 🎯 Funzionalità

- 📷 **Upload foto** di copertine libri
- 🔍 **Estrazione ISBN** automatica tramite OCR
- 📚 **Ricerca libro** su Google Books API e OpenLibrary
- 📋 **Visualizzazione dettagli** (titolo, autore, editore, prezzo, link)
- 💾 **Cronologia ricerche** locali

## 🛠️ Stack Tecnologico

### Frontend
- HTML5, CSS3, JavaScript vanilla
- Responsive design

### Backend
- Python 3.8+
- Flask
- EasyOCR per estrazione testo
- OpenCV per processing immagini

### Integrazioni
- Google Books API
- OpenLibrary API

## 📦 Installazione

### Prerequisiti
- Python 3.8+
- pip

### Setup

```bash
# Clona il repository
git clone https://github.com/sansonneninni-tech/book-isbn.git
cd book-isbn

# Crea ambiente virtuale
python -m venv venv
source venv/bin/activate  # Su Windows: venv\Scripts\activate

# Installa dipendenze
pip install -r requirements.txt
```

## 🚀 Avvio

```bash
python app.py
```

Apri il browser e vai a `http://localhost:5000`

## 📝 Utilizzo

1. Carica una foto della copertina del libro
2. L'app estrae automaticamente l'ISBN
3. Ricerca il libro su database online
4. Visualizza i risultati con link per acquistare

## 🤖 Telegram Spam Tester

In `telegram_tester/` c'è un tool separato dall'app: invia un messaggio su un gruppo
Telegram a intervalli regolari, per testare filtri antispam sui propri gruppi di prova.
Vedi [telegram_tester/README.md](telegram_tester/README.md).

```bash
cd telegram_tester
export TELEGRAM_BOT_TOKEN="123456789:AAH..."
python sender.py chats
python sender.py send -c -1001234567890 -m "test {n}" -i 5 -n 20
```

## 📄 Licenza

MIT

## 👤 Autore

sansonneninni-tech