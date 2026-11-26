# CodeBlock: Game Rules

## Game setup

- **Players:** 2–8
- **Rounds:** 3
- **Questions per round:** 5
- **Time per question:** 20 seconds
- **Options per question:** 4
- **Difficulty preset:** chosen by the host

## Difficulty presets

| Preset | Round 1 | Round 2 | Round 3 |
|---|---|---|---|
| Casual | Easy | Easy | Medium |
| Normal | Easy | Medium | Hard |
| Expert | Medium | Hard | Hard |

## Question difficulty

| Difficulty | What the player fills in | Complexity |
|---|---|---|
| Easy | The missing part of one line | Simple |
| Medium | A whole line | Moderate |
| Hard | A whole line | Complex and tricky |

## Round twists

| Twist | Effect |
|---|---|
| Standard | Normal scoring. |
| Double | Correct answers are worth 2× points. |
| Steal | Normal scoring first, then faster players steal from the leader. |

## Steal rules (per question)

1. The **leader** is the player with the highest score **before** this question's points are awarded. Ties use the normal leaderboard tie-break.
2. Award normal time-based points first.
3. A correct player who answered **faster than the leader** steals **100 points** from the leader.
4. If the leader did not answer (timeout or disconnected), **every correct player** steals.
5. If the leader answered wrong but has a response time, faster correct players still steal.
6. The total stolen per question is capped at **300 points**.
7. If the leader cannot cover the total, the available points are split **equally** among the stealers. Any remainder goes to the fastest stealers.
8. The leader's score never goes below **0**.
9. A disconnected leader stays on the leaderboard and can still be stolen from.

## Scoring

```text
points = BASE_POINTS + MAX_SPEED_BONUS × (1 − timeTaken / QUESTION_TIME_SECONDS)
```

- Clamp `timeTaken` to `[0, QUESTION_TIME_SECONDS]`.
- Round the result to the nearest whole number.
- Wrong or no answer: **0 points**.
- Double round: multiply the result by **2**.
- Steal round: no multiplier; apply steals after normal scoring.

## Constants

All rule values live in [`server/constants.js`](../server/constants.js).
