const textarea = document.getElementById('poemInput');
const backdrop = document.getElementById('backdrop');
const editorContainer = document.getElementById('editorContainer');
const repeatedWordsList = document.getElementById('repeatedWordsList');
const wordCountDisplay = document.getElementById('wordCount');
const uniqueWordsList = document.getElementById('uniqueWordsList');
const uniqueWordCountDisplay = document.getElementById('uniqueWordCount');

// --- Theme Toggler ---
const themeToggleBtn = document.getElementById('themeToggle');
const rootElement = document.documentElement;

// Default to system preference
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

function setTheme(theme) {
    if (theme === 'dark') {
        rootElement.setAttribute('data-theme', 'dark');
        themeToggleBtn.innerHTML = '☀️'; // Change to light mode icon
    } else {
        rootElement.setAttribute('data-theme', 'light');
        themeToggleBtn.innerHTML = '🌙'; // Change to dark mode icon
    }
}

let currentTheme = localStorage.getItem('theme');
if (!currentTheme) {
    currentTheme = prefersDark ? 'dark' : 'light';
}
setTheme(currentTheme);

themeToggleBtn.addEventListener('click', () => {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', currentTheme);
    setTheme(currentTheme);
});


// --- Poem Logic ---

// A set of colors matching CSS variables for red/orange distribution
const highlightColors = [
    'var(--h-color-1)',
    'var(--h-color-2)',
    'var(--h-color-3)',
    'var(--h-color-4)',
    'var(--h-color-5)',
    'var(--h-color-6)'
];

const escapeHTML = (str) => {
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');
};

const handleInput = () => {
    const text = textarea.value;
    
    // Calculate words using Unicode property escapes
    const rawWords = text.match(/[\p{L}]+(?:-[\p{L}]+)*/gu) || [];
    
    const wordCounts = {};
    const repeatingWordsSet = new Set();
    const firstOccurrenceOrder = [];
    
    rawWords.forEach(word => {
        const lowerWord = word.toLowerCase();
        if (!wordCounts[lowerWord]) {
            wordCounts[lowerWord] = 0;
            firstOccurrenceOrder.push(lowerWord);
        }
        wordCounts[lowerWord]++;
        if (wordCounts[lowerWord] > 1) {
            repeatingWordsSet.add(lowerWord);
        }
    });

    wordCountDisplay.textContent = `Words: ${rawWords.length}`;

    // Calculate unique alphabetized vocabulary
    const uniqueWordsAlphabetical = Object.keys(wordCounts).sort((a, b) => a.localeCompare(b));
    uniqueWordCountDisplay.textContent = `Unique: ${uniqueWordsAlphabetical.length}`;
    
    if (uniqueWordsAlphabetical.length > 0) {
        uniqueWordsList.innerHTML = uniqueWordsAlphabetical.map(w => `<div class="vocab-item">${w}</div>`).join('');
    } else {
        uniqueWordsList.innerHTML = '<span class="stat">No words yet!</span>';
    }

    // Filter to only repeating words, keeping their first occurrence order
    const orderedRepeatingWords = firstOccurrenceOrder.filter(w => repeatingWordsSet.has(w));

    // Map each identified repeating word to a specific color
    const wordColorMap = {};
    let colorIndex = 0;
    orderedRepeatingWords.forEach(word => {
        wordColorMap[word] = highlightColors[colorIndex % highlightColors.length];
        colorIndex++;
    });

    // We split by Word Regex to ensure we preserve all other characters intact safely
    const tokens = text.split(/([\p{L}]+(?:-[\p{L}]+)*)/gu);
    let finalHTML = '';
    
    tokens.forEach(token => {
        if (/^[\p{L}]+(?:-[\p{L}]+)*$/u.test(token)) { // Is a word token
            const lowerWord = token.toLowerCase();
            if (repeatingWordsSet.has(lowerWord)) {
                const color = wordColorMap[lowerWord];
                finalHTML += `<mark style="background-color: ${color};">${escapeHTML(token)}</mark>`;
            } else {
                finalHTML += escapeHTML(token);
            }
        } else { // Characters, whitespace, punctuation
            finalHTML += escapeHTML(token);
        }
    });

    // Fix webkit bug where trailing newlines don't expand div height correctly
    if (finalHTML.endsWith('\n')) {
        finalHTML += ' '; // Invisible character keeps the line space rendered
    }

    backdrop.innerHTML = finalHTML;

    // Toggle styling & update insights UI
    if (repeatingWordsSet.size > 0) {
        editorContainer.classList.add('has-error');
        
        let pillsHTML = '';
        orderedRepeatingWords.forEach(word => {
            const color = wordColorMap[word];
            // We give the pill border the same color to connect the logic
            pillsHTML += `<div class="pill" style="border-left: 6px solid ${color}">${word} <span class="count">${wordCounts[word]}</span></div>`;
        });
        repeatedWordsList.innerHTML = pillsHTML;
    } else {
        editorContainer.classList.remove('has-error');
        repeatedWordsList.innerHTML = '<span class="stat">No repeats yet. Your poem is completely unique.</span>';
    }
};

textarea.addEventListener('input', handleInput);

// Window resize can affect wrapping bounds slightly
window.addEventListener('resize', handleInput);

// Initial call
handleInput();
