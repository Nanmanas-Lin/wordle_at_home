from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_session import Session  # New: Enables persistent sessions
import random

app = Flask(__name__)

# === SESSION CONFIGURATION ===
app.secret_key = 'your_secret_key_here'  # Change to a secure key
app.config['SESSION_TYPE'] = 'filesystem'  # Store session data on the server
app.config['SESSION_PERMANENT'] = False   # Ensure session is not permanent
app.config['SESSION_USE_SIGNER'] = True   # Sign session cookies for security
Session(app)  # Initialize Flask-Session

# === CORS CONFIGURATION ===
CORS(app, supports_credentials=True)  # Ensure frontend receives session cookies

# === GAME CONSTANTS ===
WORD_LIST = ["REACT", "FLASK", "KNIFE", "CHALK", "MONEY"]
WORD_LENGTH = 5
MAX_ATTEMPTS = 6

# === HELPER FUNCTION ===
def get_feedback(guess, secret_word):
    feedback = []
    for i, char in enumerate(guess):
        if char == secret_word[i]:
            feedback.append("green")
        elif char in secret_word:
            feedback.append("yellow")
        else:
            feedback.append("gray")
    return feedback

# === WORD CHECK ENDPOINT ===
@app.route("/check", methods=["POST"])
def check_word():
    # Initialize session if missing
    if 'attempts' not in session:
        print("[DEBUG] Initializing session...")
        session['attempts'] = 0
        session['secret_word'] = random.choice(WORD_LIST)

    # Get user input
    data = request.get_json()
    guess = data.get("guess", "").upper()
    
    # Validate guess
    if len(guess) != WORD_LENGTH:
        return jsonify({"error": "Invalid word length"}), 400

    # Increment attempts & ensure session persistence
    session['attempts'] += 1
    session.modified = True  # Ensure session updates persist

    # Generate feedback
    feedback = get_feedback(guess, session['secret_word'])
    game_over = guess == session['secret_word'] or session['attempts'] >= MAX_ATTEMPTS

    print(f"[DEBUG] Secret: {session['secret_word']} | Attempt {session['attempts']}: {guess}")

    return jsonify({"feedback": feedback, "gameOver": game_over})

# === RESTART ENDPOINT ===
@app.route("/restart", methods=["POST"])
def restart_game():
    print("[DEBUG] Restart endpoint hit")
    session.pop('attempts', None)  # Reset attempt count
    session['secret_word'] = random.choice(WORD_LIST)  # Pick new word
    session.modified = True
    print(f"[DEBUG] New Secret Word: {session['secret_word']}")
    return jsonify({"message": "Game restarted"})

# === RUN FLASK SERVER ===
if __name__ == "__main__":
    app.run(debug=True)
