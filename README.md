# Rogle

Wordle x Balatro — a browser game built with plain HTML, CSS, and JavaScript.

## Run locally

From this directory, start a local server:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`. No build step or package installation is required.

## Files

- `index.html`: page structure and dialogs.
- `css/styles.css`: all colours, layouts, responsive rules, and animations.
- `js/words.js`: answer list and accepted guess dictionary.
- `js/game.js`: game rules, scoring, shop, cards, dragging, input, and saved progress.

The scripts are classic scripts loaded at the end of the page. Keep `words.js`
before `game.js`, which uses its word lists. Styles and scripts were extracted
without changing their contents from the supplied v17 prototype.

Progress uses the original browser local-storage key. It is tied to the browser
and origin, so opening the game at a different address or port uses separate
saved progress.
