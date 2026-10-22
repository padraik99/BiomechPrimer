# BiomechPrimer

A self-paced biomechanics course built as a static web app: plain HTML, CSS and JavaScript, with no build step.

## Run it

- **Hosted:** GitHub Pages. In the repo go to Settings → Pages → Source: *Deploy from a branch*, then choose branch `main` and folder `/ (root)`.
- **Locally:** double-click `index.html`. Every page works from `file://`.

## Units

| Unit | Content | Status |
|---|---|---|
| 0 | Planes, axes, joint actions: blind pretest, primer, 3D plane explorer, glass-pane drill, retries | built |
| 1 | Muscle map: schematic front/back views in superficial and deep layers, 22 blind drag-and-place spots, name decoder, study model, retries | built |
| 2 | Attachments, line of pull, primary action | planned |
| 3 | Flashcards (StudyLab export), quizzes, exams | planned |
| 4 | Part 2 (position-dependent actions) and application layer | planned |

## Decisions

- **Unit 1 art:** schematic SVG drawn for the course, where each muscle is its own shape with origin and insertion points so line of pull can be computed. Each muscle also links to the matching OpenStax figure for checking realism.
- **Flashcards to StudyLab:** BiomechPrimer exports a JSON file that StudyLab's "Import cards" button reads (that button is being added in the StudyLab repo):

```json
{
  "format": "studylab-cards",
  "version": 1,
  "source": "BiomechPrimer",
  "subject": "Biomechanics",
  "cards": [
    { "sourceId": "u0-slice-fro", "front": "A frontal plane cut separates the body into [___] and [___] parts.",
      "answer": "anterior|||posterior", "hint": "two panes of glass, chest and back", "difficulty": "basic" },
    { "sourceId": "u0-fro-actions", "kind": "anyOf", "front": "Name one frontal-plane joint action.",
      "accept": ["abduction", "adduction", "lateral flexion", "inversion", "eversion"], "difficulty": "basic" }
  ]
}
```

`[___]` marks a blank. Two blanks take two answers separated by `|||`. `difficulty` is `basic`, `application` or `synthesis`. `sourceId` is stable, so re-importing a corrected card updates it instead of creating a duplicate.

## Learning design

- **Blind pretest:** you answer first, before studying. Answers stay hidden until the retry.
- **Confidence rating on every answer.** High-confidence errors get a callout on retry (the hypercorrection effect).
- **Spacing:** the first retry opens 2 days after the blind attempt. After that, correct answers return in 1, 3, 7 and 14 days, and misses return in 1 day.

## Progress sync

Progress is stored in `localStorage`. Use **Export** and **Import** on the Home page to sync through a file in your Google Drive folder. Import merges: the newest copy of each item wins.

## Checks

```
node tests/figure.test.js     # Unit 0 joint actions (plain Node)
node tests/spots.check.js     # Unit 1 drop spots (needs Playwright + Chromium)
```

`figure.test.js` checks two things:
- Every animated joint action moves in the anatomically correct direction.
- Each action stays inside its plane, which is the rule the glass-pane drill depends on.

`spots.check.js` checks that every Unit 1 drop spot sits on its own muscle, with that muscle painted on top. Re-run it after any anatomy correction.

## Layout

```
index.html          home: weekly sessions, due retries, export/import
units/unit0.html    Unit 0
css/style.css
js/store.js         progress, spaced-retry scheduler, export/import merge
js/figure.js        3D stick figure, planes, axes, joint actions (Pointer Events)
js/quiz.js          blind / retry / practice quiz engine
js/unit0-data.js    Unit 0 question bank
js/unit0.js         Unit 0 page controller
js/theme.js         light/dark override
units/unit1.html    Unit 1
js/muscles-data.js  muscle shapes, layers, drop spots: ALL Unit 1 anatomy lives here
js/model.js         draws a scene (right side authored, left mirrored)
js/unit1.js         Unit 1 page controller
tests/              Node checks (no dependencies)
```
