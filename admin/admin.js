const cardList = document.getElementById("cardList");
const cardTemplate = document.getElementById("cardTemplate");

const cardCount = document.getElementById("cardCount");
const statusElement = document.getElementById("status");

const addCardButton = document.getElementById("addCardButton");
const saveButton = document.getElementById("saveButton");

let cards = [];
let hasUnsavedChanges = false;


/*
 * Load the deck from the same JSON file
 * used by the main application.
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

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error(
        "cards.json does not contain a valid card array."
      );
    }

    cards = data;

    renderCards();

    setStatus("");

  } catch (error) {

    console.error(error);

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
 * Generate an ID that is highly unlikely
 * to collide with an existing card.
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
 * Mark the page as containing edits
 * that have not yet been saved.
 */
function markChanged() {

  hasUnsavedChanges = true;

  saveButton.disabled = false;

  setStatus("Unsaved changes");

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
 * Basic validation.
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
 * Save will be connected to GitHub
 * in the next step.
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


  console.log(
    "Cards ready to save:",
    cards
  );


  setStatus(
    "Cards are valid. GitHub saving will be added next.",
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
 * Warn if the user tries to leave
 * while changes are unsaved.
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
