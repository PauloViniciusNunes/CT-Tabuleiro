export function cellToPosition(cell: string) {

    const alpha = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
        'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
    ] // Convenção do Alfabeto

    let letters = [];
    let number: string | number = "";

    for (const char of cell) {
        if (Number.isNaN(Number(char))) {
            letters.push(char);
        }
        else {
            number += char; // Conseguir y
        }
    }

    number = Number(number)
    letters.reverse()

    let c = 0;
    for (let i = 0; i < letters.length; i++) {
        c += (26 ** i) * (alpha.indexOf(letters[i]) + 1)  // Conseguir x
    }

    const position = { row: number, col: c }
    return position;
}