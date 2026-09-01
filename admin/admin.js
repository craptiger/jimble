const DRAFT_STORAGE_KEY = "jimble-admin-draft-v1";

const cardList = document.getElementById("cardList");
const cardTemplate = document.getElementById("cardTemplate");

const cardCount = document.getElementById("cardCount");
const statusElement = document.getElementById("status");

const addCardButton = document.getElementById("addCardButton");
const saveButton = document.getElementById("saveButton");

let cards = [];
let hasUnsavedChanges = false;


/*
 * Load the published deck.
 *
 * If a local draft exists, restore that instead.
 */
async function loadCards() {

  setStatus("Loading cards...");

  try {

    const response = await fetch("../data/cards.json", {
      cache: "no-cache"
    });

    if (!response.ok) {
      throw new Error(
        `Unable to load cards (${response.status}).`
      );
    }

    const publishedCards = await response.json();

    if (!Array.isArray(publishedCards)) {
      throw new Error(
        "cards.json does not contain a valid card array."
      );
    }


    /*
     * Prefer a locally saved draft if one exists.
     */
    const draft = loadLocalDraft();

    if (draft) {

      cards = draft.cards;

      hasUnsavedChanges = true;
      saveButton.disabled = false;

      renderCards();

      setStatus(
        "Local draft restored.",
        "success"
      );

      return;
    }


    /*
     * Otherwise use the published deck.
     */
    cards = publishedCards;

    hasUnsavedChanges = false;
    saveButton.disabled = true;

    renderCards();

    setStatus("");

  } catch (error) {

    console.error(error);

    /*
     * If the network failed, we may still have
     * a locally saved admin draft.
     */
    const draft = loadLocalDraft();

    if (draft) {

      cards = draft.cards;

      hasUnsavedChanges = true;
      saveButton.disabled = false;

      renderCards();

      setStatus(
        "Working from locally saved draft.",
        "success"
      );

      return;
    }


    setStatus(
      error.message || "Unable to load cards.",
      "error"
    );

  }

}


/*
 * Render all cards.
 */
function renderCards() {

  cardList.innerHTML = "";

  cards.forEach(card => {

    const fragment =
      cardTemplate.content.cloneNode(true);

    const article =
      fragment.querySelector(".admin-card");

    const idInput =
      fragment.querySelector(".card-id");

    const textInput =
      fragment.querySelector(".card-text");

    const deleteButton =
      fragment.querySelector(".delete-card-button");


    idInput.value = card.id;
    textInput.value = card.text || "";


    textInput.addEventListener("input", () => {

      card.text = textInput.value;

      markChanged();

    });


    deleteButton.addEventListener("click", () => {

      deleteCard(card.id);

    });


    article.dataset.cardId = card.id;

    cardList.appendChild(fragment);

  });


  updateCardCount();

}


/*
 * Add a new card.
 */
function addCard() {

  const card = {
    id: createCardId(),
    text: ""
  };

  cards.push(card);

  renderCards();

  markChanged();


  /*
   * Scroll to and focus the new card.
   */
  const newCardElement =
    cardList.querySelector(
      `[data-card-id="${card.id}"]`
    );

  if (newCardElement) {

    newCardElement.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

    const textInput =
      newCardElement.querySelector(".card-text");

    textInput?.focus();

  }

}


/*
 * Delete a card.
 */
function deleteCard(id) {

  const card =
    cards.find(card => card.id === id);

  if (!card) {
    return;
  }


  const label =
    card.text.trim().slice(0, 60) || card.id;


  const confirmed =
    window.confirm(
      `Delete "${label}"?`
    );


  if (!confirmed) {
    return;
  }


  cards =
    cards.filter(card => card.id !== id);


  renderCards();

  markChanged();

}


/*
 * Generate a unique card ID.
 */
function createCardId() {

  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {

    return `card-${crypto.randomUUID()}`;

  }


  return `card-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;

}


/*
 * A change has been made.
 *
 * Save it immediately as a local browser draft.
 */
function markChanged() {

  hasUnsavedChanges = true;

  saveButton.disabled = false;

  saveLocalDraft();

}


/*
 * Save the current working deck to localStorage.
 */
function saveLocalDraft() {

  try {

    const draft = {
      cards: cards,
      savedAt: new Date().toISOString()
    };

    localStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify(draft)
    );

    setStatus(
      "Local draft saved.",
      "success"
    );

  } catch (error) {

    console.error(
      "Unable to save local draft:",
      error
    );

    setStatus(
      "Unable to save local draft.",
      "error"
    );

  }

}


/*
 * Load a previously saved local draft.
 */
function loadLocalDraft() {

  try {

    const stored =
      localStorage.getItem(DRAFT_STORAGE_KEY);

    if (!stored) {
      return null;
    }


    const draft = JSON.parse(stored);

    if (
      !draft ||
      !Array.isArray(draft.cards)
    ) {

      localStorage.removeItem(
        DRAFT_STORAGE_KEY
      );

      return null;
    }


    return draft;

  } catch (error) {

    console.error(
      "Unable to load local draft:",
      error
    );

    localStorage.removeItem(
      DRAFT_STORAGE_KEY
    );

    return null;

  }

}


/*
 * Remove the local draft.
 *
 * We will call this after a successful
 * GitHub save in the next stage.
 */
function clearLocalDraft() {

  localStorage.removeItem(
    DRAFT_STORAGE_KEY
  );

}


/*
 * Count cards.
 */
function updateCardCount() {

  const count = cards.length;

  cardCount.textContent =
    `${count} ${count === 1 ? "card" : "cards"}`;

}


/*
 * Validate the deck.
 */
function validateCards() {

  for (const card of cards) {

    if (!card.id) {

      return {
        valid: false,
        message: "A card is missing its ID."
      };

    }


    if (!card.text.trim()) {

      return {
        valid: false,
        message:
          `Card ${card.id} needs some text.`
      };

    }

  }


  return {
    valid: true
  };

}


/*
 * For now this validates and guarantees
 * the current deck is stored locally.
 *
 * The next step will replace this with
 * the GitHub commit operation.
 */
function saveChanges() {

  const validation = validateCards();


  if (!validation.valid) {

    setStatus(
      validation.message,
      "error"
    );

    return;

  }


  saveLocalDraft();


  console.log(
    "Cards ready to save to GitHub:",
    cards
  );


  setStatus(
    "Changes saved locally. Ready to publish to GitHub.",
    "success"
  );

}


/*
 * Status helper.
 */
function setStatus(message, type = "") {

  statusElement.textContent = message;

  statusElement.className = "status";


  if (type) {
    statusElement.classList.add(type);
  }

}


/*
 * Warn if leaving with changes that
 * have not yet been published to GitHub.
 *
 * The changes themselves are safe because
 * they have already been stored locally.
 */
window.addEventListener(
  "beforeunload",
  event => {

    if (!hasUnsavedChanges) {
      return;
    }

    event.preventDefault();

    event.returnValue = "";

  }
);


/*
 * Button events.
 */
addCardButton.addEventListener(
  "click",
  addCard
);


saveButton.addEventListener(
  "click",
  saveChanges
);


/*
 * Start admin.
 */
loadCards();
