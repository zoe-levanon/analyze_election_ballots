import * as fs from "fs";
const parse = require("csv-parse/lib/sync");
const iconv = require('iconv-lite');

export type ElectionsData = {
    ballots: Array<SingleBallotData>;
    byBallot: Record<string, CumulativeBallotData>;
    byBallotGroup: Record<string, CumulativeBallotData>;
    byMunicipality: Record<string, CumulativeBallotData>;
    totals: CumulativeBallotData;
}

export type VotingData = {
    voters: number;
    totalVotes: number;
    disqualified: number;
    validVotes: number;
    votes: Record<string, number>;
}

export type SingleBallotData = VotingData & {
    municipalityName: string;
    municipalityId: string;
    ballotId: string;    
}

export type CumulativeBallotData = VotingData & {
    id: string;
}

export function readElections(file: string): ElectionsData {
    const ballots = readBallots(file);
    const byBallot = accumulateBy(ballots, b => `${b.municipalityId}/${b.ballotId}`);
    const byBallotGroup = accumulateBy(ballots, b => {
        let ballotId = b.ballotId;
        let firstPeriod = ballotId.indexOf('.');
        if (firstPeriod > 0) {
            ballotId = ballotId.substring(0, firstPeriod);
        }
        return `${b.municipalityId}/${ballotId}`;
    });
    const byMunicipality = accumulateBy(ballots, b => `${b.municipalityId}`);
    const totals = accumulateBy(ballots, b => `x`)["x"];
    return {
        ballots,
        byBallot,
        byBallotGroup,
        byMunicipality,
        totals
    }
}

/**
 * Read csv data
 * @param file file to read from (either local of s3)
 * @returns array of rows (key=value map) in CSV file
 */
 export function readBallots(file: string): Array<SingleBallotData> {
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

function processLine(line: string[], columnNames: string[]): SingleBallotData {
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

export function accumulateBy(ballots: Array<SingleBallotData>, idFunc: (b: SingleBallotData) => string): Record<string, CumulativeBallotData> {
    // Group by ID
    const byId = ballots.reduce((prev: any, cur: SingleBallotData) => {
        let id = idFunc(cur);
        let ballots = prev[id] || [];
        ballots.push(cur);
        prev[id] = ballots;
        return prev;
    }, {});    

    // Accumulate votes by ID
    let accumulations: Record<string, CumulativeBallotData> = {};
    Object.keys(byId).forEach(k =>  {
        const ballots: Array<SingleBallotData> = byId[k];
        const cumulate: CumulativeBallotData = {
            id: k,
            voters: 0,
            validVotes: 0,
            disqualified: 0,
            totalVotes: 0,
            votes: {},
        };
        ballots.forEach(b => addVotingData(b, cumulate));
        accumulations[k] = cumulate;
    })

    return accumulations;
}

export function addVotingData(cur: SingleBallotData, cumulate: CumulativeBallotData) {        
    cumulate.disqualified += cur.disqualified;
    cumulate.totalVotes += cur.totalVotes;
    cumulate.validVotes += cur.validVotes;
    cumulate.voters += cur.voters;
    const parties = Object.keys(cur.votes);
    parties.forEach(p => {
        cumulate.votes[p] = (cumulate.votes[p] || 0) + (cur.votes[p] || 0);
    })    
}