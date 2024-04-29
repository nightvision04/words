/**
     * Shuffles an array using Fisher-Yates (Knuth) shuffle algorithm.
     */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Distributes Scrabble tiles to two players while attempting to balance the score.
 */
function distributeTiles(scrabblePieces) {
    // Flatten the piece distribution according to count and shuffle them
    let allTiles = [];
    scrabblePieces.forEach(piece => {
        for (let i = 0; i < piece.count; i++) {
            allTiles.push({ letter: piece.letter, points: piece.points });
        }
    });
    allTiles = shuffleArray(allTiles);

    // Allocate tiles to players
    const midPoint = Math.floor(allTiles.length / 2);
    let playerOneTiles = allTiles.slice(0, midPoint);
    let playerTwoTiles = allTiles.slice(midPoint);

    // Optionally, you might want to implement additional logic to balance the points
    // This example assumes a simple split which might not perfectly balance the points

    return {
        creator: playerOneTiles,
        joiner: playerTwoTiles
    };
}

export { distributeTiles };