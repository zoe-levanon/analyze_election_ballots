import * as fs from "fs";
const parse = require("csv-parse/lib/sync");
const iconv = require('iconv-lite');

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
 export function readBallots(file: string): Array<BallotData> {
    // Read CSV file as binary
    let buffer = fs.readFileSync(file, {encoding: "binary"});

    // Convert line 0 from ISO-8859-8 to standard UTF
    let contents = buffer.toString();
    let lines = contents.split("\n").map(l => iconv.decode(l,"ISO-8859-8"));
    const sBuffer = Buffer.from(lines.join("\n"), "utf8");
    
    // Parse the CSV
    let result: Array<string[]> = parse(sBuffer, {trim: true});
    let columnNames: string[] = result.shift()!;
    // Remove empty header columns
    while (columnNames[columnNames.length - 1] === "") {
        columnNames.pop();
    }
    return result.map((r: any, index: number) => processLine(r, columnNames));
}

function processLine(line: string[], columnNames: string[]): BallotData {
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
}

export function accumulateBy(ballots: Array<BallotData>, idFunc: (b: BallotData) => string): any {
    // ballots.reduce(b, index) {
    //     (b[index[key]] = b[index[key]] || []).push(x);
    //     return b;
    //   }, {});

      const red = ballots.reduce((prev: any, cur: BallotData) => {
          let id = idFunc(cur);
          let array = prev[id] || [];
          array.push(cur);        
          prev[id] = array;
            return prev;
      }, {});

      return red;
}