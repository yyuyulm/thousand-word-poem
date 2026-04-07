const textarea = document.getElementById('poemInput');
const backdrop = document.getElementById('backdrop');
const editorContainer = document.getElementById('editorContainer');
const repeatedWordsList = document.getElementById('repeatedWordsList');
const uniqueWordsList = document.getElementById('uniqueWordsList');
const filteredVocabList = document.getElementById('filteredVocabList');
const uniqueHeading = document.getElementById('uniqueHeading');
const countHeading = document.getElementById('countHeading');
const vocabSearchInput = document.getElementById('vocabSearch');

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
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
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

    // Filter to only repeating words, keeping their first occurrence order
    const orderedRepeatingWords = firstOccurrenceOrder.filter(w => repeatingWordsSet.has(w));

    // Map each identified repeating word to a specific color
    const wordColorMap = {};
    let colorIndex = 0;
    orderedRepeatingWords.forEach(word => {
        wordColorMap[word] = highlightColors[colorIndex % highlightColors.length];
        colorIndex++;
    });

    countHeading.textContent = `Word Count: ${rawWords.length}`;

    // Calculate unique alphabetized vocabulary
    const uniqueWordsAlphabetical = Object.keys(wordCounts).sort((a, b) => a.localeCompare(b));
    uniqueHeading.textContent = `Unique: ${uniqueWordsAlphabetical.length}`;
    
    // Filter vocabulary based on search input
    const searchQuery = vocabSearchInput.value.toLowerCase().trim();
    const filteredUniqueWords = uniqueWordsAlphabetical.filter(w => w.includes(searchQuery));

    if (filteredUniqueWords.length > 0) {
        filteredVocabList.innerHTML = filteredUniqueWords.map(w => {
            const escapedWord = escapeHTML(w);
            return `<div class="vocab-item" data-word="${escapedWord}"><span>${escapedWord}</span></div>`;
        }).join('');
    } else {
        const noResultsMsg = searchQuery ? 'No matches found.' : 'No words yet!';
        filteredVocabList.innerHTML = `<span class="stat">${noResultsMsg}</span>`;
    }

    // We split by Word Regex to ensure we preserve all other characters intact safely
    const tokens = text.split(/([\p{L}]+(?:-[\p{L}]+)*)/gu);
    let finalHTML = '';
    
    tokens.forEach(token => {
        if (/^[\p{L}]+(?:-[\p{L}]+)*$/u.test(token)) { // Is a word token
            const lowerWord = token.toLowerCase();
            const escapedToken = escapeHTML(token);
            const escapedDataWord = escapeHTML(lowerWord);
            
            if (repeatingWordsSet.has(lowerWord)) {
                const color = wordColorMap[lowerWord];
                finalHTML += `<mark style="background-color: ${color};" class="word-node" data-word="${escapedDataWord}">${escapedToken}</mark>`;
            } else {
                finalHTML += `<span class="word-node" data-word="${escapedDataWord}">${escapedToken}</span>`;
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
    // Keep scroll in sync if content changes height
    backdrop.scrollTop = textarea.scrollTop;
    
    // Toggle styling & update insights UI
    if (repeatingWordsSet.size > 0) {
        editorContainer.classList.add('has-error');
        
        let pillsHTML = '';
        orderedRepeatingWords.forEach(word => {
            const color = wordColorMap[word];
            const escapedWord = escapeHTML(word);
            pillsHTML += `
                <div class="pill" style="border-left: 4px solid ${color}" data-word="${escapedWord}">
                    <span class="word-text">${escapedWord}</span>
                    <span class="count-block" style="background-color: ${color}; color: var(--bg-main);">${wordCounts[word]}</span>
                </div>`;
        });
        repeatedWordsList.innerHTML = pillsHTML;
    } else {
        editorContainer.classList.remove('has-error');
        repeatedWordsList.innerHTML = '<span class="stat">No repeating words yet.<br>Every word in your poem is unique :)</span>';
    }
};

textarea.addEventListener('input', handleInput);

// Sync scrolling
textarea.addEventListener('scroll', () => {
    backdrop.scrollTop = textarea.scrollTop;
});

// Window resize can affect wrapping bounds slightly
window.addEventListener('resize', handleInput);

// Listener for vocabulary search
vocabSearchInput.addEventListener('input', handleInput);

// --- Find and Scroll Logic (Ctrl+F behavior) ---
let currentSearchWord = null;
let currentSearchIndex = -1;

function findAndScrollTo(word) {
    if (!word) return;
    
    if (word !== currentSearchWord) {
        currentSearchWord = word;
        currentSearchIndex = -1;
    }

    const cssSafeWord = word.replace(/"/g, '\\"');
    const nodes = document.querySelectorAll(`.word-node[data-word="${cssSafeWord}"]`);
    if (nodes.length === 0) return;

    if (currentSearchIndex === -1) {
        let bestIndex = 0;
        // Find nearest next node visible within document flow
        for (let i = 0; i < nodes.length; i++) {
            const rect = nodes[i].getBoundingClientRect();
            if (rect.top > 80) { // Slight offset for header space
                bestIndex = i;
                break;
            }
        }
        currentSearchIndex = bestIndex;
    } else {
        // Cycling to the next occurrence
        currentSearchIndex = (currentSearchIndex + 1) % nodes.length;
    }

    const targetNode = nodes[currentSearchIndex];
    // Calculate target position relative to the textarea's viewport
    // offsetTop is relative to the backdrop container
    const scrollTarget = targetNode.offsetTop - (textarea.clientHeight / 3);
    
    textarea.scrollTo({
        top: scrollTarget,
        behavior: 'smooth'
    });

    // Restart the CSS flash animation by resetting the classes and triggering a DOM reflow
    targetNode.classList.remove('flash-highlight');
    if (targetNode.flashTimeout) clearTimeout(targetNode.flashTimeout);
    void targetNode.offsetWidth; 
    targetNode.classList.add('flash-highlight');
    
    // Automatically strip the class once the animation ends to return it below the editor text
    targetNode.flashTimeout = setTimeout(() => {
        targetNode.classList.remove('flash-highlight');
    }, 900);
}

// Global hook for pill and vocabulary item clicks
document.addEventListener('click', (e) => {
    const vocabItem = e.target.closest('.vocab-item');
    if (vocabItem) {
        findAndScrollTo(vocabItem.getAttribute('data-word'));
    }
    
    const pill = e.target.closest('.pill');
    if (pill) {
        findAndScrollTo(pill.getAttribute('data-word'));
    }
});

// Initial call
handleInput();
