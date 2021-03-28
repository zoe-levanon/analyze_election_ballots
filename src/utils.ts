import * as fs from "fs";
const parse = require("csv-parse/lib/sync");

export type BallotData = {
    municipalityName: string;
    municipalityId: string;
    ballotId: string;
    voters: number;
    totalVotes: number;
    disqualified: number;
    validVotes: number;
    votes: Record<string, number>;
}

/**
 * Read csv data
 * @param file file to read from (either local of s3)
 * @returns array of rows (key=value map) in CSV file
 */
 function readCsv(file: string): Array<any> {
    // Read CSV file as binary
    let buffer = fs.readFileSync(file, {encoding: "binary"});

    // Convert line 0 from ISO-8859-8 to standard UTF
    let contents = buffer.toString();
    let lines = contents.split("\n").map(l => iconv.decode(l,"ISO-8859-8"));
    const sBuffer = Buffer.from(lines.join("\n"), "utf8");
    
    // Parse the CSV
    let result = parse(sBuffer, {trim: true});
    let columnNames: string[] = result[0];
    // Remove empty header columns
    while (columnNames[columnNames.length - 1] === "") {
        columnNames.pop();
    }
    let item = processLine(result[1], columnNames, 1);
    return result.map((r: any, index: number) => processLine(r, columnNames, index + 2));
}

function processLine(line: string[], columnNames: string[], index: number): BallotData {
    let ballotVotes: Record<string, number> = {};
    for (let i = 11 ; i < columnNames.length ; i++) {
        ballotVotes[columnNames[i]] = parseInt(line[i]);
    }
    return {
        municipalityName: line[2],
        municipalityId: line[3],
        ballotId: line[4],
        voters: parseInt(line[7]),
        totalVotes: parseInt(line[8]),
        disqualified: parseInt(line[9]),
        validVotes: parseInt(line[10]),
        votes: ballotVotes
    }
    // let rowAsMap = new Map<string, string>();
    // Object.keys(line).forEach(key => result.set(key.toLowerCase(), line[key]));
    // result.set("_line", index.toString());
    // return result;
}

var iconv = require('iconv-lite');
const ballots = readCsv(process.argv[2]);
console.log(ballots[45]);
// let e1 = iconv.encodingExists("ISO-8859-1");
// let e2 = iconv.encodingExists("ISO-8859-8");
// let e3 = iconv.encodingExists("fake-8859-1");
// console.log(e1, e2, e3);

