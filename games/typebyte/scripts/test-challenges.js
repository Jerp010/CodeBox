const { getChallenge, difficultyForBoss } = require("../server/challenges");

const used = [];
for(let boss = 0; boss < 3; boss++) {
    const level = difficultyForBoss(boss);
    for(let i = 0; i < 5; i++) {
        const c = getChallenge("python", level, used);
        used.push(c.id); 
        console.log(`boss ${boss + 1} | ${c.id} | ${c.syntax}`);
    }
}

try {
    // getChallenge('cpp', 'EASY');
    getChallenge('python', 'EXTREME');
} catch (err) {
    console.log(err.message);
}
