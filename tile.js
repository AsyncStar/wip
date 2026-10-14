const files = [
    './vocabData/vocab1.json',
    './vocabData/vocab2.json',
    './vocabData/vocab3.json'
];

const vocabArrays = await Promise.all(files.map(async file => {
    const response = await fetch(file);
    return response.json();
}));

const vocabulary = Object.assign({}, ...vocabArrays);

const tagResponse = await fetch('./systemData/tagData.json');
const tagData = await tagResponse.json();

const kanjiResponse = await fetch('./systemData/kanjiData.json');
const kanjiData = await kanjiResponse.json();



function openVocabModal(event) {
    const tile = event.target;
    const tileMeaning = tile.dataset.meaning;
    const tileReading = tile.dataset.reading;
    const tileNotes = [];
    tile.notes?.forEach(note => {
        tileNotes.push(tile.dataset[note]);
    })
    console.log(tileNotes)

    const modal = document.querySelector("#tile-modal");
    const modalHeader = modal.querySelector(".modal-header");
    const modalMeaning = modal.querySelector(".modal-meaning");
    const modalReading = modal.querySelector(".modal-reading");
    const modalNotes = modal.querySelector(".modal-notes");

    modalHeader.textContent = tile.textContent
    modalReading.innerHTML = `Reading: ${tileReading}`;
    modalMeaning.innerHTML = `Meaning: ${tileMeaning}`;
    modalNotes.innerHTML = `Notes: ${tileNotes}`;

    modal.showModal();

    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            const rect = modal.getBoundingClientRect()

            const isOutside = (
                event.clientX < rect.left || event.clientX > rect.right ||
                event.clientY < rect.top || event.clientY > rect.bottom
            );

            if (isOutside) {
                modal.close()
            }
        }
    });
}

function getActiveTags(container) {
    const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');

    return [...checkboxes].map(checkbox => checkbox.value);

}

function getKanjiMode() {
    return document.querySelector(
        '[data-set="page-mode"] input[name="page-mode"]:checked'
    )?.value;
}
function getActiveParentTag(container) {
    return container.querySelector(
        'input[type="radio"][name$="-parent-tag"]:checked'
    )?.value;
}

function getActiveChildTags(container, parentTag) {
    const category = container.dataset.vocab;

    const childArea = document.querySelector(
        `[data-child-area="${category}"]`
    );

    if (!childArea) return [];

    const dropdown = [...childArea.querySelectorAll(".dropdown-content")]
        .find(element => element.dataset.parent === parentTag);

    if (!dropdown) return [];

    return [...dropdown.querySelectorAll(
        'input[type="checkbox"]:checked'
    )].map(checkbox => checkbox.value);
}
function getChildTags(parentTag, tagData, category) {
    return Object.keys(tagData[category][parentTag] ?? {});
}
function filterSemanticTags(vocabulary, category, parentTag, selectedChildren, tagData) {
    const childTags = Object.keys(
        tagData[category][parentTag] ?? {}
    );

    const tagsToMatch = selectedChildren.length > 0
        ? selectedChildren
        : childTags.length > 0
            ? childTags
            : [parentTag];

    return Object.entries(vocabulary).filter(([id, data]) => {
        return data.category === category &&
            tagsToMatch.some(tag =>
                data.semanticTags.includes(tag)
            );
    });
}
function filterKanji(vocabulary, selectedKanji) {
    return Object.entries(vocabulary).filter(([id, data]) => {
        return selectedKanji.some(kanji =>
            data.kanjiTags?.includes(kanji)
        );
    });
}
function filterVocabulary(vocabulary, category, parentTag, selectedChildren, selectedKanji, mode, tagData) {
    if (mode === "semantic-only") {
        return filterSemanticTags(
            vocabulary, category, parentTag,
            selectedChildren, tagData
        );
    }

    if (mode === "kanji-only") {
        return filterKanji(vocabulary, selectedKanji)
            .filter(([id, data]) => data.category === category);
    }

    if (mode === "combined") {
        const semanticResults = filterSemanticTags(
            vocabulary, category, parentTag,
            selectedChildren, tagData
        );

        return semanticResults.filter(([id, data]) =>
            selectedKanji.some(kanji =>
                data.kanjiTags?.includes(kanji)
            )
        );
    }

    return [];
}
function createVocabTile(data, destination) {
    const main = data.main;
    const meaning = data.meaning;
    const reading = data.reading;
    const tile = document.createElement('span');

    tile.dataset.meaning = meaning;
    tile.dataset.reading = reading;

    data.notes?.forEach(note => {
        tile.dataset[note.id] = note;
    })

    tile.classList.add('tile');
    tile.innerHTML = main;
    destination.appendChild(tile);

   tile.addEventListener('click', (event) => {
        openVocabModal(event);
    })
}

function createKanjiButton(id, data, destination) {
    const button = document.createElement('button');

    button.type = 'button';
    button.classList.add('kanji-tag');
    button.textContent = data.main;
    button.dataset.kanjiId = id;

    button.setAttribute(
        'aria-pressed',
        selectedKanjiIds.includes(id)
    );

    button.classList.toggle(
        'active',
        selectedKanjiIds.includes(id)
    );

    button.addEventListener('click', () => {
        selectKanji(id, data);
    });

    destination.append(button);
}

function createLessonTabs(kanjiData) {
    const destination = document.querySelector('#lesson-tabs');
    destination.replaceChildren();

    const lessons = [
        ...new Set(
            Object.values(kanjiData).map(data => data.lesson)
        )
    ].sort((a, b) => a - b);

    lessons.forEach((lesson, index) => {
        const button = document.createElement('button');

        button.type = 'button';
        button.textContent = `Lesson ${lesson}`;

        button.addEventListener('click', () => {
            showLessonKanji(lesson, kanjiData);

            destination.querySelectorAll('button').forEach(tab => {
                tab.classList.toggle('active', tab === button);
            });
        });

        destination.append(button);

        // Show the first lesson when the drawer loads.
        if (index === 0) {
            button.classList.add('active');
            showLessonKanji(lesson, kanjiData);
        }
    });
}

function showLessonKanji(lesson, kanjiData) {
    const destination = document.querySelector('#lesson-kanji');
    destination.replaceChildren();

    Object.entries(kanjiData).forEach(([id, data]) => {
        if (data.lesson === lesson) {
            createKanjiButton(id, data, destination);
        }
    });
}

function renderSelectedKanji() {
    const slots = document.querySelectorAll('.kanji-slot');

    slots.forEach((slot, index) => {
        const id = selectedKanjiIds[index];
        slot.replaceChildren();

        if (!id) return;

        const data = kanjiData[id];
        if (!data) return;

        const character = document.createElement('h2');
        character.textContent = data.main;

        const reading = document.createElement('p');
        reading.textContent =
            `Reading: ${data.reading.join(', ')}`;

        const meaning = document.createElement('p');
        meaning.textContent = `Meaning: ${data.meaning}`;

        slot.append(character, reading, meaning);
    });
}

const selectedKanjiIds = [];

function selectKanji(id) {
    const index = selectedKanjiIds.indexOf(id);

    // Clicking an already-selected kanji removes it.
    if (index !== -1) {
        selectedKanjiIds.splice(index, 1);
    } else {
        // Allow a maximum of two selected kanji.
        if (selectedKanjiIds.length >= 2) {
            return;
        }

        selectedKanjiIds.push(id);
    }

    renderSelectedKanji();
    updateKanjiButtons();
    updateVocabulary();
}

createLessonTabs(kanjiData);


function getActiveKanji(container) {

    return [...selectedKanjiIds];
}

function updateKanjiButtons() {
    document.querySelectorAll('.kanji-tag').forEach(button => {
        const isActive = selectedKanjiIds.includes(
            button.dataset.kanjiId
        );

        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', isActive);
    });
}


function populateVocabTile(results, destination) {
    // Remove the previous tiles.
    destination.replaceChildren();

    // Create a tile for each matching vocabulary entry.
    results.forEach(([wordId, data]) => {
        createVocabTile(data, destination);
    });
}

function updateDropdowns(container) {
    const category = container.dataset.vocab;

    const childArea = document.querySelector(
        `[data-child-area="${category}"]`
    );

    // Some categories don't have child tags.
    if (!childArea) return;

    const selectedParent = container.querySelector(
        'input[type="radio"][name$="-parent-tag"]:checked'
    )?.value;

    childArea.querySelectorAll(".dropdown-content").forEach(dropdown => {
        dropdown.classList.toggle(
            "active",
            dropdown.dataset.parent === selectedParent
        );
    });
}

// Initialize each vocabulary category.
document.querySelectorAll(".vocab").forEach(container => {
    const radios = container.querySelectorAll(
        'input[type="radio"][name$="-parent-tag"]'
    );

    radios.forEach(radio => {
        radio.addEventListener("change", () => {
            updateDropdowns(container);
            updateVocabulary();
        });
    });

    updateDropdowns(container);
});

document.querySelectorAll(".vocab").forEach(container => {
    const parentRadios = container.querySelectorAll(
        'input[type="radio"][name$="-parent-tag"]'
    );

    parentRadios.forEach(radio => {
        radio.addEventListener("change", () => {
            updateDropdowns(container);
        });
    });

    // Set the correct dropdown when the page first loads
    updateDropdowns(container);
});


function updateVocabulary() {
    const containers = document.querySelectorAll('.vocab[data-vocab]');

    containers.forEach(container => {
        const category = container.dataset.vocab;
        const selectedTags = getActiveTags(container);
        const selectedKanji = getActiveKanji();
        const mode = getKanjiMode();

        const parentTag = getActiveParentTag(container);
        const selectedChildren = getActiveChildTags(
            container,
            parentTag
        );

        const results = filterVocabulary(
            vocabulary,
            category,
            parentTag,
            selectedChildren,
            selectedKanji,
            mode,
            tagData
        );

        const destination = document.querySelector(`[data-dest="${category}"]`);

        populateVocabTile(results, destination);
    });
}

document.addEventListener("change", event => {
    if (
        event.target.matches(
            '.tags input[type="checkbox"], ' +
            '.tags input[type="radio"], ' +
            '.child-tag-area input[type="checkbox"]'
        )
    ) {
        updateVocabulary();
    }
});
updateVocabulary();
