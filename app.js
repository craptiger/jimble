const STORAGE_KEY = "jimble-current-card";
const HISTORY_STORAGE_KEY = "jimble-recent-cards";

const RECENT_CARD_LIMIT = 3;

const cardElement = document.getElementById("card");
const deckView = document.getElementById("deckView");
const cardView = document.getElementById("cardView");

const cardText = document.getElementById("cardText");
const cardCounter = document.getElementById("cardCounter");

const statusElement = document.getElementById("status");

let cards = [];
let isShuffling = false;


/*
 * Load the deck.
 */
async function loadCards() {

  try {

    const response = await fetch("./data/cards.json", {
      cache: "no-cache"
    });

    if (!response.ok) {
      throw new Error("Unable to load cards.");
    }

    cards = await response.json();

    if (!Array.isArray(cards) || cards.length === 0) {
      showEmptyDeck();
      return;
    }

    restorePreviousCard();

  } catch (error) {

    console.error(error);

    statusElement.textContent =
      "The card deck could not be loaded.";

  }

}


/*
 * Restore the card that was showing
 * when the user last used Jimble.
 */
function restorePreviousCard() {

  const savedId =
    localStorage.getItem(STORAGE_KEY);

  if (!savedId) {
    showDeck();
    return;
  }

  const savedCard =
    cards.find(card => card.id === savedId);

  if (!savedCard) {

    localStorage.removeItem(STORAGE_KEY);

    showDeck();

    return;

  }

  showCard(savedCard);

}


/*
 * Get the recently shown card IDs.
 */
function getRecentCardIds() {

  try {

    const stored =
      localStorage.getItem(
        HISTORY_STORAGE_KEY
      );

    if (!stored) {
      return [];
    }

    const history = JSON.parse(stored);

    if (!Array.isArray(history)) {
      return [];
    }

    return history;

  } catch {

    return [];

  }

}


/*
 * Save a card into recent history.
 */
function rememberCard(cardId) {

  let history =
    getRecentCardIds();

  history.push(cardId);

  history =
    history.slice(-RECENT_CARD_LIMIT);

  localStorage.setItem(
    HISTORY_STORAGE_KEY,
    JSON.stringify(history)
  );

}


/*
 * Choose a random card that has not
 * appeared in the last 3 draws.
 */
function chooseRandomCard() {

  const recentIds =
    getRecentCardIds();


  let eligibleCards =
    cards.filter(
      card => !recentIds.includes(card.id)
    );


  /*
   * Fallback for very small decks.
   */
  if (eligibleCards.length === 0) {

    eligibleCards = cards;

  }


  const index =
    Math.floor(
      Math.random() * eligibleCards.length
    );


  return eligibleCards[index];

}


/*
 * Perform the shuffle animation and reveal
 * the selected card.
 */
function drawCard() {

  if (
    isShuffling ||
    cards.length === 0
  ) {
    return;
  }


  isShuffling = true;

  cardElement.classList.add("shuffling");


  setTimeout(() => {

    const selectedCard =
      chooseRandomCard();


    showCard(selectedCard);


    localStorage.setItem(
      STORAGE_KEY,
      selectedCard.id
    );


    rememberCard(
      selectedCard.id
    );


    cardElement.classList.remove(
      "shuffling"
    );

    isShuffling = false;

  }, 500);

}


/*
 * Show the initial deck.
 */
function showDeck() {

  deckView.classList.remove("hidden");
  cardView.classList.add("hidden");

  statusElement.textContent = "";

}


/*
 * Display a selected card.
 */
function showCard(card) {

  cardText.textContent = card.text;


  /*
   * Find this card's position in the
   * current published deck.
   */
  const cardIndex =
    cards.findIndex(
      item => item.id === card.id
    );


  cardCounter.textContent =
    `${cardIndex + 1} of ${cards.length}`;


  deckView.classList.add("hidden");
  cardView.classList.remove("hidden");

  statusElement.textContent = "";

}


/*
 * Handle an empty deck gracefully.
 */
function showEmptyDeck() {

  deckView.classList.add("hidden");
  cardView.classList.remove("hidden");

  cardText.textContent =
    "There are currently no cards in this deck.";

  cardCounter.textContent = "0 of 0";

  statusElement.textContent = "";

}


/*
 * Touch/click interaction.
 */
cardElement.addEventListener(
  "click",
  drawCard
);


/*
 * Keyboard accessibility.
 */
cardElement.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Enter" ||
      event.key === " "
    ) {

      event.preventDefault();

      drawCard();

    }

  }
);


/*
 * Register the PWA service worker.
 */
if ("serviceWorker" in navigator) {

  window.addEventListener(
    "load",
    () => {

      navigator.serviceWorker
        .register("./service-worker.js")
        .catch(error => {

          console.error(
            "Service worker registration failed:",
            error
          );

        });

    }
  );

}


/*
 * Start Jimble.
 */
loadCards();
