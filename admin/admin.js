const DRAFT_STORAGE_KEY = "jimble-admin-draft-v1";

const GITHUB_OWNER = "craptiger";
const GITHUB_REPO = "jimble";
const GITHUB_BRANCH = "main";
const GITHUB_FILE_PATH = "data/cards.json";

const cardList = document.getElementById("cardList");
const cardTemplate = document.getElementById("cardTemplate");

const cardCount = document.getElementById("cardCount");
const statusElement = document.getElementById("status");

const addCardButton = document.getElementById("addCardButton");
const saveButton = document.getElementById("saveButton");

let cards = [];
let hasUnsavedChanges = false;

/*
 * The GitHub token exists only in memory.
 *
 * It is forgotten whenever the Admin page
 * is refreshed or closed.
 */
let githubToken = null;


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
     * If the network failed, we may still
     * have a locally saved draft.
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
 * Mark the working deck as changed.
 *
 * Every change is immediately protected
 * by saving a draft locally.
 */
function markChanged() {

  hasUnsavedChanges = true;

  saveButton.disabled = false;

  saveLocalDraft();

}


/*
 * Save the current working deck locally.
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
 * Load a saved local draft.
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
 * Remove the local draft after GitHub
 * has successfully accepted the update.
 */
function clearLocalDraft() {

  localStorage.removeItem(
    DRAFT_STORAGE_KEY
  );

}


/*
 * Update the displayed card count.
 */
function updateCardCount() {

  const count = cards.length;

  cardCount.textContent =
    `${count} ${count === 1 ? "card" : "cards"}`;

}


/*
 * Validate the deck before publishing.
 */
function validateCards() {

  const seenIds = new Set();


  for (const card of cards) {

    if (!card.id) {

      return {
        valid: false,
        message: "A card is missing its ID."
      };

    }


    if (seenIds.has(card.id)) {

      return {
        valid: false,
        message:
          `Duplicate card ID: ${card.id}`
      };

    }


    seenIds.add(card.id);


    if (
      typeof card.text !== "string" ||
      !card.text.trim()
    ) {

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
 * Ask for the GitHub token if we do not
 * already have one during this page session.
 */
function getGitHubToken() {

  if (githubToken) {
    return githubToken;
  }


  const enteredToken = window.prompt(
    "Enter your GitHub personal access token.\n\n" +
    "It will only be kept in memory until this page is closed or refreshed."
  );


  if (!enteredToken) {
    return null;
  }


  githubToken = enteredToken.trim();

  return githubToken;

}


/*
 * Encode UTF-8 text as Base64 for GitHub.
 */
function textToBase64(text) {

  const bytes =
    new TextEncoder().encode(text);

  let binary = "";


  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }


  return btoa(binary);

}


/*
 * Read the current cards.json metadata
 * directly from GitHub.
 *
 * We need its SHA before GitHub will allow
 * us to replace the existing file.
 */
async function getGitHubFile(token) {

  const url =
    `https://api.github.com/repos/` +
    `${GITHUB_OWNER}/${GITHUB_REPO}/contents/` +
    `${GITHUB_FILE_PATH}?ref=${GITHUB_BRANCH}`;


  const response = await fetch(url, {

    method: "GET",

    headers: {
      "Accept":
        "application/vnd.github+json",

      "Authorization":
        `Bearer ${token}`,

      "X-GitHub-Api-Version":
        "2022-11-28"
    }

  });


  if (response.status === 401) {

    githubToken = null;

    throw new Error(
      "GitHub rejected the token. Please check it and try again."
    );

  }


  if (response.status === 403) {

    throw new Error(
      "The token does not have permission to update this repository."
    );

  }


  if (response.status === 404) {

    throw new Error(
      "GitHub could not find data/cards.json in the repository."
    );

  }


  if (!response.ok) {

    throw new Error(
      `GitHub returned error ${response.status}.`
    );

  }


  return response.json();

}


/*
 * Publish the complete deck to GitHub.
 */
async function publishToGitHub(
  token,
  currentFileSha
) {

  const url =
    `https://api.github.com/repos/` +
    `${GITHUB_OWNER}/${GITHUB_REPO}/contents/` +
    `${GITHUB_FILE_PATH}`;


  /*
   * Produce clean, readable JSON in GitHub.
   */
  const json =
    JSON.stringify(cards, null, 2) + "\n";


  const response = await fetch(url, {

    method: "PUT",

    headers: {

      "Accept":
        "application/vnd.github+json",

      "Authorization":
        `Bearer ${token}`,

      "X-GitHub-Api-Version":
        "2022-11-28",

      "Content-Type":
        "application/json"

    },


    body: JSON.stringify({

      message:
        "Update Jimble cards",

      content:
        textToBase64(json),

      sha:
        currentFileSha,

      branch:
        GITHUB_BRANCH

    })

  });


  if (response.status === 401) {

    githubToken = null;

    throw new Error(
      "GitHub rejected the token. Please check it and try again."
    );

  }


  if (response.status === 403) {

    throw new Error(
      "The token does not have permission to update this repository."
    );

  }


  if (response.status === 409) {

    throw new Error(
      "The GitHub file changed while you were editing. Please refresh Admin and try again."
    );

  }


  if (!response.ok) {

    let details = "";

    try {

      const errorBody =
        await response.json();

      if (errorBody.message) {
        details = ` ${errorBody.message}`;
      }

    } catch {
      // Ignore unreadable GitHub error body.
    }


    throw new Error(
      `GitHub returned error ${response.status}.${details}`
    );

  }


  return response.json();

}


/*
 * Validate and publish the deck.
 */
async function saveChanges() {

  if (!hasUnsavedChanges) {
    return;
  }


  const validation =
    validateCards();


  if (!validation.valid) {

    setStatus(
      validation.message,
      "error"
    );

    return;

  }


  /*
   * Make sure the latest work is safely
   * stored locally before attempting GitHub.
   */
  saveLocalDraft();


  const token =
    getGitHubToken();


  if (!token) {

    setStatus(
      "Publish cancelled. Your changes are still saved locally."
    );

    return;

  }


  saveButton.disabled = true;
  addCardButton.disabled = true;

  setStatus(
    "Publishing to GitHub..."
  );


  try {

    /*
     * First get the current GitHub file SHA.
     */
    const currentFile =
      await getGitHubFile(token);


    if (!currentFile.sha) {

      throw new Error(
        "GitHub did not return the current file version."
      );

    }


    /*
     * Then replace cards.json.
     */
    await publishToGitHub(
      token,
      currentFile.sha
    );


    /*
     * GitHub has accepted the commit.
     */
    clearLocalDraft();

    hasUnsavedChanges = false;

    saveButton.disabled = true;
    addCardButton.disabled = false;


    setStatus(
      "Published to GitHub. The live app will update shortly.",
      "success"
    );


  } catch (error) {

    console.error(error);


    /*
     * The local draft remains intact if
     * anything goes wrong.
     */
    saveButton.disabled = false;
    addCardButton.disabled = false;


    setStatus(
      error.message ||
      "Unable to publish to GitHub.",
      "error"
    );

  }

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
 * Warn if the user leaves while changes
 * have not yet been published to GitHub.
 *
 * The draft itself is still safe locally.
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
 * Start Admin.
 */
loadCards();
