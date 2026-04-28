// --- State Management ---
let allQuestions = [];
let currentQuestion = null;

// Load progress from localStorage
let progress = {
    answeredTitles: JSON.parse(localStorage.getItem('quiz_answered')) || [],
    correctCount: parseInt(localStorage.getItem('quiz_correct_count')) || 0,
    totalAnswered: parseInt(localStorage.getItem('quiz_total_answered')) || 0
};

// --- DOM Elements ---
const DOM = {
    fileUpload: document.getElementById('file-upload'),
    resetBtn: document.getElementById('reset-btn'),
    scorePercent: document.getElementById('score-percent'),
    answeredCount: document.getElementById('answered-count'),
    msgContainer: document.getElementById('message-container'),
    quizArea: document.getElementById('question-area'),
    qTitle: document.getElementById('q-title'),
    qTopic: document.getElementById('q-topic'),
    qText: document.getElementById('q-text'),
    qImages: document.getElementById('q-images'),
    qInteraction: document.getElementById('q-interaction-area'),
    qFeedback: document.getElementById('q-feedback-area'),
    feedbackTitle: document.getElementById('feedback-title'),
    qAnswerImages: document.getElementById('q-answer-images'),
    qExplanation: document.getElementById('q-explanation'),
    selfMarkControls: document.getElementById('self-mark-controls'),
    nextBtn: document.getElementById('next-btn'),
    markCorrectBtn: document.getElementById('mark-correct-btn'),
    markIncorrectBtn: document.getElementById('mark-incorrect-btn')
};

// --- Initialization ---
function init() {
    updateStatsUI();
    
    // Attempt to load default questions.json
    fetch('questions.json')
        .then(response => {
            if (!response.ok) throw new Error("Local file not found");
            return response.json();
        })
        .then(data => {
            allQuestions = data;
            startQuiz();
        })
        .catch(err => {
            DOM.msgContainer.textContent = "Could not load questions.json automatically. Please upload a file.";
        });

    // Event Listeners
    DOM.fileUpload.addEventListener('change', handleFileUpload);
    DOM.resetBtn.addEventListener('click', resetProgress);
    DOM.nextBtn.addEventListener('click', loadNextQuestion);
    DOM.markCorrectBtn.addEventListener('click', () => recordSelfMark(true));
    DOM.markIncorrectBtn.addEventListener('click', () => recordSelfMark(false));
}

// --- File Handling ---
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            allQuestions = JSON.parse(e.target.result);
            startQuiz();
        } catch (error) {
            alert("Invalid JSON format.");
        }
    };
    reader.readAsText(file);
}

// --- Quiz Logic ---
function startQuiz() {
    DOM.msgContainer.style.display = 'none';
    DOM.quizArea.style.display = 'block';
    loadNextQuestion();
}

function loadNextQuestion() {
    // Hide feedback areas
    DOM.qFeedback.style.display = 'none';
    DOM.selfMarkControls.style.display = 'none';
    DOM.nextBtn.style.display = 'none';
    DOM.qInteraction.innerHTML = '';
    DOM.qImages.innerHTML = '';
    DOM.qAnswerImages.innerHTML = '';

    // Find next unanswered question
    currentQuestion = allQuestions.find(q => !progress.answeredTitles.includes(q.title));

    if (!currentQuestion) {
        DOM.quizArea.style.display = 'none';
        DOM.msgContainer.style.display = 'block';
        DOM.msgContainer.textContent = "🎉 You have completed all available questions!";
        return;
    }

    renderQuestion(currentQuestion);
}

function renderQuestion(q) {
    DOM.qTitle.textContent = q.title;
    DOM.qTopic.textContent = `Topic: ${q.topic}`;
    DOM.qText.textContent = q.questionText.replace('//IMG//', ''); // Clean up marker if present

    // Render Question Images
    if (q.questionImages && q.questionImages.length > 0) {
        q.questionImages.forEach(src => {
            const img = document.createElement('img');
            img.src = src;
            DOM.qImages.appendChild(img);
        });
    }

    // Determine Interaction Mode
    if (q.isMultipleChoice && q.choices) {
        renderMultipleChoice(q);
    } else {
        renderSelfMarking(q);
    }
}

function renderMultipleChoice(q) {
    const form = document.createElement('form');
    
    for (const [key, value] of Object.entries(q.choices)) {
        const label = document.createElement('label');
        label.className = 'choice-label';
        
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'choice';
        radio.value = key;
        
        label.appendChild(radio);
        label.appendChild(document.createTextNode(` ${key}: ${value}`));
        form.appendChild(label);
    }

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'btn btn-primary';
    submitBtn.textContent = 'Submit Answer';
    
    form.appendChild(submitBtn);

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const selected = form.querySelector('input[name="choice"]:checked');
        if (!selected) return alert("Please select an answer.");
        
        const isCorrect = selected.value === q.correctAnswer;
        handleAnswer(isCorrect);
        submitBtn.disabled = true; // Prevent multiple submissions
    });

    DOM.qInteraction.appendChild(form);
}

function renderSelfMarking(q) {
    const revealBtn = document.createElement('button');
    revealBtn.className = 'btn btn-primary';
    revealBtn.textContent = 'Reveal Answer';
    
    revealBtn.addEventListener('click', () => {
        revealBtn.style.display = 'none';
        showFeedback(null); // null means self-marking mode
    });

    DOM.qInteraction.appendChild(revealBtn);
}

// --- Evaluation & Feedback ---
function handleAnswer(isCorrect) {
    updateProgress(isCorrect);
    showFeedback(isCorrect);
}

function recordSelfMark(isCorrect) {
    updateProgress(isCorrect);
    DOM.selfMarkControls.style.display = 'none';
    DOM.nextBtn.style.display = 'block';
}

function showFeedback(autoGradeResult) {
    DOM.qFeedback.style.display = 'block';
    
    // Auto-graded vs Self-graded logic
    if (autoGradeResult !== null) {
        DOM.feedbackTitle.textContent = autoGradeResult ? "✅ Correct!" : `❌ Incorrect! (Correct answer: ${currentQuestion.correctAnswer})`;
        DOM.feedbackTitle.style.color = autoGradeResult ? "var(--success)" : "var(--danger)";
        DOM.nextBtn.style.display = 'block';
    } else {
        DOM.feedbackTitle.textContent = "Answer Reveal:";
        DOM.feedbackTitle.style.color = "inherit";
        if (currentQuestion.correctAnswer) {
            DOM.feedbackTitle.textContent += ` ${currentQuestion.correctAnswer}`;
        }
        DOM.selfMarkControls.style.display = 'flex';
    }

    // Render Answer Images
    if (currentQuestion.answerImages && currentQuestion.answerImages.length > 0) {
        currentQuestion.answerImages.forEach(src => {
            const img = document.createElement('img');
            img.src = src;
            DOM.qAnswerImages.appendChild(img);
        });
    }

    // Render Explanation
    DOM.qExplanation.textContent = currentQuestion.explanation ? `Explanation: ${currentQuestion.explanation}` : '';
}

// --- State Updates ---
function updateProgress(isCorrect) {
    progress.answeredTitles.push(currentQuestion.title);
    progress.totalAnswered++;
    if (isCorrect) progress.correctCount++;

    // Save to localStorage
    localStorage.setItem('quiz_answered', JSON.stringify(progress.answeredTitles));
    localStorage.setItem('quiz_correct_count', progress.correctCount);
    localStorage.setItem('quiz_total_answered', progress.totalAnswered);

    updateStatsUI();
}

function updateStatsUI() {
    DOM.answeredCount.textContent = progress.totalAnswered;
    const percentage = progress.totalAnswered === 0 ? 0 : Math.round((progress.correctCount / progress.totalAnswered) * 100);
    DOM.scorePercent.textContent = `${percentage}%`;
}

function resetProgress() {
    if(!confirm("Are you sure you want to reset all your progress?")) return;
    
    progress = { answeredTitles: [], correctCount: 0, totalAnswered: 0 };
    localStorage.removeItem('quiz_answered');
    localStorage.removeItem('quiz_correct_count');
    localStorage.removeItem('quiz_total_answered');
    
    updateStatsUI();
    
    if (allQuestions.length > 0) {
        startQuiz();
    }
}

// Boot up
init();