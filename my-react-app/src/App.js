import { useState, useCallback, useRef, useEffect } from "react";
import "./App.css";

const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const checkGuess = async (guess) => {
  const response = await fetch("http://localhost:5000/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guess }),
    credentials: "include", // Ensure session cookies are sent with the request
  });
  return response.json();
};

const restartGame = async () => {
  await fetch("http://localhost:5000/restart", {
    method: "POST",
    credentials: "include", // Ensure session cookies are sent with the request
  });
};

export default function WordleGame() {
  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState(Array(WORD_LENGTH).fill(""));
  const [feedback, setFeedback] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [letterFeedback, setLetterFeedback] = useState({}); // To track feedback for each letter

  // Create refs for each input box
  const inputRefs = useRef([]);

  // Handle input change
  const handleInputChange = useCallback((e, index) => {
    const value = e.target.value.toUpperCase();

    // Ensure the value is a single alphabetic character
    if (/^[A-Z]*$/.test(value)) {
      setCurrentGuess((prevGuess) => {
        const updatedGuess = [...prevGuess];
        updatedGuess[index] = value.slice(0, 1); // Ensure only 1 character per box
        return updatedGuess;
      });
      // Automatically move focus to the next input if current box is filled
      if (value.length === 1 && index < WORD_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus(); // Ensure focus only when ref is valid
      }
    }
  }, []);

  // Handle click on an input box (focus the first empty input box)
  const handleClickInputBox = useCallback((index) => {
    // Find the first empty input box (if any) and focus on it
    const firstEmptyIndex = currentGuess.findIndex((char) => char === "");
    if (firstEmptyIndex !== -1 && inputRefs.current[firstEmptyIndex]) {
      inputRefs.current[firstEmptyIndex].focus();
    }
  }, [currentGuess]);

  // Submit the guess
  const handleSubmit = useCallback(async () => {
    const guess = currentGuess.join(""); // Join the array into a single string
    if (guess.length === WORD_LENGTH && guesses.length < MAX_ATTEMPTS) {
      const result = await checkGuess(guess);
      
      // Add the guess and feedback to state
      setGuesses((prevGuesses) => {
        const updatedGuesses = [...prevGuesses, guess];
        if (updatedGuesses.length >= MAX_ATTEMPTS) {
          setGameOver(true); // Set gameOver when max attempts are reached
        }
        return updatedGuesses;
      });
      setFeedback((prevFeedback) => [...prevFeedback, result.feedback]);
      setCurrentGuess(Array(WORD_LENGTH).fill(""));
  
      // Update letter feedback based on the result
      const updatedLetterFeedback = { ...letterFeedback };
      result.feedback.forEach((status, index) => {
        const letter = guess[index];
        updatedLetterFeedback[letter] = status; // Store feedback for each letter
      });
      setLetterFeedback(updatedLetterFeedback);
  
      // If the game is over, no further guess should be submitted
      if (result.gameOver) {
        setGameOver(true);
      }
  
      // Focus on the first empty input box after submit
      const firstEmptyIndex = currentGuess.findIndex((char) => char === "");
      if (firstEmptyIndex !== -1 && inputRefs.current[firstEmptyIndex]) {
        inputRefs.current[firstEmptyIndex].focus(); // Focus only when ref is valid
      }
    }
  }, [currentGuess, guesses, letterFeedback]);

  // Restart the game
  const handleRestart = useCallback(async () => {
    await restartGame();
    setGuesses([]);
    setFeedback([]);
    setCurrentGuess(Array(WORD_LENGTH).fill(""));
    setGameOver(false); // Reset game over state
    setLetterFeedback({}); // Reset letter feedback
  }, []);

  // Handle backspace logic
  const handleBackspace = useCallback((e, index) => {
    if (e.key === "Backspace" && currentGuess[index] === "") {
      // Focus on the previous box if the current box is empty and backspace is pressed
      if (index > 0) {
        inputRefs.current[index - 1]?.focus(); // Ensure focus only when ref is valid
      }
    }

    if (e.key === "Enter") {
      handleSubmit();
    }
  }, [currentGuess]);

  // Focus on the next empty input box after render
  useEffect(() => {
    const firstEmptyIndex = currentGuess.findIndex((char) => char === "");
    if (firstEmptyIndex !== -1 && inputRefs.current[firstEmptyIndex]) {
      inputRefs.current[firstEmptyIndex].focus();
    }
  }, [currentGuess]);

  // Function to get the color for a letter based on its feedback
  const getLetterColor = (letter) => {
    const status = letterFeedback[letter];
    if (status === "green") {
      return "bg-green-500";
    } else if (status === "yellow") {
      return "bg-yellow-500";
    } else if (status === "gray") {
      return "bg-gray-500";
    } else {
      return "bg-white";
    }
  };

  return (
    <div className="flex flex-col items-center p-4">
      <h1 className="text-2xl font-bold">Wordle At Home</h1>

      {/* Render guesses */}
      {Array.from({ length: MAX_ATTEMPTS }).map((_, attemptIndex) => (
        <div key={attemptIndex} className="flex gap-2 my-2">
          {Array.from({ length: WORD_LENGTH }).map((_, boxIndex) => {
            const guessChar = guesses[attemptIndex]?.[boxIndex] || "";
            const boxFeedback = feedback[attemptIndex]?.[boxIndex] || "";

            return (
              <span
                key={boxIndex}
                className={`w-10 h-10 flex items-center justify-center text-lg font-bold text-white rounded ${
                  boxFeedback === "green"
                    ? "bg-green-500"
                    : boxFeedback === "yellow"
                    ? "bg-yellow-500"
                    : "bg-gray-500"
                }`}
              >
                {guessChar}
              </span>
            );
          })}
        </div>
      ))}

      {/* Render current guess input */}
      {!gameOver && guesses.length < MAX_ATTEMPTS && (
        <div className="flex gap-2 my-4">
          {/* Render individual editable input boxes */}
          {currentGuess.map((char, i) => (
            <input
              key={i}
              type="text"
              value={char}
              onChange={(e) => handleInputChange(e, i)}
              onKeyDown={(e) => handleBackspace(e, i)}
              className="w-10 h-10 text-lg font-bold text-center border border-gray-400 rounded"
              maxLength={1} // Only allow 1 character per box
              disabled={gameOver || guesses.length >= MAX_ATTEMPTS}
              ref={(el) => (inputRefs.current[i] = el)} // Store the reference for each input
              onClick={() => handleClickInputBox(i)} // Focus on the first empty box when clicked
            />
          ))}
          <button
            onClick={handleSubmit}
            className="bg-blue-500 text-white px-4 py-2 rounded"
            disabled={currentGuess.join("").length !== WORD_LENGTH}
          >
            Submit
          </button>
        </div>
      )}

      {/* Render Keyboard Layout */}
      <div className="grid grid-cols-10 gap-2 my-4">
        {ALPHABET.split("").map((letter) => (
          <button
            key={letter}
            className={`w-12 h-12 text-lg font-bold text-center rounded ${getLetterColor(letter)} ${gameOver ? "cursor-not-allowed" : ""}`}
            disabled={gameOver}
            onClick={() => {}}
          >
            {letter}
          </button>
        ))}
      </div>

      {gameOver && (
        <div className="text-center mt-4">
          <p className="text-green-600 font-bold">Game Over!</p>
          <button
            onClick={handleRestart}
            className="bg-red-500 text-white px-4 py-2 rounded mt-2"
          >
            Restart Game
          </button>
        </div>
      )}
    </div>
  );
}
